/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { getErrorMessage, isNodeError } from './errors.js';
import { URL } from 'node:url';
import * as dns from 'node:dns/promises';
import type { LookupOptions } from 'node:dns';
import * as net from 'node:net';
import { Agent, fetch as undiciFetch, ProxyAgent, setGlobalDispatcher } from 'undici';

// Hostnames that resolve to loopback regardless of /etc/hosts trickery.
const LOOPBACK_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
]);

// Cloud-metadata service hostnames that MUST never be fetched.
const METADATA_HOSTNAMES = new Set([
  'metadata.google.internal',
  'metadata',
]);

export class FetchError extends Error {
  constructor(
    message: string,
    public code?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'FetchError';
  }
}

function ipv4ToNumber(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet < 0 || octet > 255) return null;
    n = (n << 8) + octet;
  }
  return n >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToNumber(ip);
  if (n === null) return false;
  // 0.0.0.0/8 — "this network"
  if ((n & 0xff000000) === 0x00000000) return true;
  // 10.0.0.0/8
  if ((n & 0xff000000) === 0x0a000000) return true;
  // 100.64.0.0/10 — carrier-grade NAT (RFC 6598); includes Alibaba IMDS
  // 100.100.100.200.
  if ((n & 0xffc00000) === 0x64400000) return true;
  // 127.0.0.0/8 — loopback
  if ((n & 0xff000000) === 0x7f000000) return true;
  // 169.254.0.0/16 — link-local, includes cloud metadata 169.254.169.254
  if ((n & 0xffff0000) === 0xa9fe0000) return true;
  // 172.16.0.0/12
  if ((n & 0xfff00000) === 0xac100000) return true;
  // 192.0.0.0/24, 192.0.2.0/24, 198.18.0.0/15, 198.51.100.0/24, 203.0.113.0/24
  if ((n & 0xffffff00) === 0xc0000000) return true;
  if ((n & 0xffffff00) === 0xc0000200) return true;
  if ((n & 0xfffe0000) === 0xc6120000) return true;
  if ((n & 0xffffff00) === 0xc6336400) return true;
  if ((n & 0xffffff00) === 0xcb007100) return true;
  // 192.168.0.0/16
  if ((n & 0xffff0000) === 0xc0a80000) return true;
  // 224.0.0.0/4 — multicast
  if ((n & 0xf0000000) === 0xe0000000) return true;
  // 240.0.0.0/4 — reserved
  if ((n & 0xf0000000) === 0xf0000000) return true;
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // ::, ::1 (loopback)
  if (lower === '::' || lower === '::1') return true;
  // ::ffff:x.x.x.x — IPv4-mapped
  const v4MappedMatch = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (v4MappedMatch) return isPrivateIPv4(v4MappedMatch[1]);
  // fc00::/7 — unique local addresses (covers fc00:..fdff:)
  if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true;
  // fe80::/10 — link-local
  if (/^fe[89ab][0-9a-f]:/.test(lower)) return true;
  // fec0::/10 — deprecated site-local (RFC 3879), still in legacy deployments
  if (/^fe[cdef][0-9a-f]:/.test(lower)) return true;
  // ff00::/8 — multicast
  if (/^ff[0-9a-f]{2}:/.test(lower)) return true;
  return false;
}

function isPrivateLiteral(hostname: string): boolean {
  if (LOOPBACK_HOSTNAMES.has(hostname.toLowerCase())) return true;
  if (METADATA_HOSTNAMES.has(hostname.toLowerCase())) return true;
  // Bracketed IPv6 literal in a URL keeps brackets in hostname; strip them.
  const stripped = hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;
  if (net.isIP(stripped) === 4) return isPrivateIPv4(stripped);
  if (net.isIP(stripped) === 6) return isPrivateIPv6(stripped);
  return false;
}

/**
 * Quick synchronous check using only the URL hostname. Catches literal IPs
 * and well-known loopback/metadata names without DNS.
 *
 * For comprehensive SSRF protection that resolves DNS-based bypasses (a
 * hostname that resolves to a private IP), call `resolveUrl` instead.
 */
export function isPrivateIp(url: string): boolean {
  try {
    return isPrivateLiteral(new URL(url).hostname);
  } catch (_e) {
    return false;
  }
}

/** Cached DNS resolution + private-IP verdict for a URL. */
export type UrlResolution = {
  /** The hostname as parsed from the URL (may include []). */
  hostname: string;
  /** A single resolved IP literal to pin the eventual connection to. */
  resolvedAddress: string;
  /** Family of the resolved address. */
  family: 4 | 6;
  /**
   * True if the URL must not be fetched — either the hostname is a
   * well-known private/loopback/metadata name, or DNS resolution
   * returned an address inside a private/loopback/metadata range, or
   * DNS resolution failed (fail-safe).
   */
  isPrivate: boolean;
};

const RESOLUTION_CACHE_TTL_MS = 60_000;
const resolutionCache = new Map<
  string,
  { resolution: UrlResolution; expires: number }
>();

/**
 * Resolve the URL's hostname via DNS and decide whether it is safe to
 * fetch. The returned resolution carries a *single* IP literal that
 * the caller should use to pin the connection (see `fetchPinned`);
 * pinning closes the DNS-rebinding TOCTOU between this check and the
 * actual fetch.
 *
 * Result is cached for {@link RESOLUTION_CACHE_TTL_MS}; a hostname
 * resolved once in a session keeps that resolution for subsequent
 * fetches in the same window.
 */
export async function resolveUrl(url: string): Promise<UrlResolution | null> {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return null;
  }

  const cacheKey = hostname.toLowerCase();
  const cached = resolutionCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.resolution;

  const stripped = hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;

  let resolution: UrlResolution;
  if (net.isIP(stripped) !== 0) {
    // IP literal — no DNS needed.
    resolution = {
      hostname,
      resolvedAddress: stripped,
      family: net.isIP(stripped) === 6 ? 6 : 4,
      isPrivate: isPrivateLiteral(hostname),
    };
  } else if (
    LOOPBACK_HOSTNAMES.has(hostname.toLowerCase()) ||
    METADATA_HOSTNAMES.has(hostname.toLowerCase())
  ) {
    // Known-private hostname; don't even bother resolving.
    resolution = {
      hostname,
      resolvedAddress: '0.0.0.0',
      family: 4,
      isPrivate: true,
    };
  } else {
    try {
      const addrs = await dns.lookup(hostname, {
        all: true,
        verbatim: true,
      });
      const anyPrivate = addrs.some((a) =>
        a.family === 6 ? isPrivateIPv6(a.address) : isPrivateIPv4(a.address),
      );
      const first = addrs[0];
      resolution = {
        hostname,
        resolvedAddress: first.address,
        family: first.family as 4 | 6,
        isPrivate: anyPrivate,
      };
    } catch {
      // Fail-safe: refuse the fetch when DNS fails. Treating as private
      // is the safest default and matches the prior isPrivateUrl()
      // behavior (which returned true on lookup failure).
      resolution = {
        hostname,
        resolvedAddress: '0.0.0.0',
        family: 4,
        isPrivate: true,
      };
    }
  }

  resolutionCache.set(cacheKey, {
    resolution,
    expires: Date.now() + RESOLUTION_CACHE_TTL_MS,
  });
  return resolution;
}

/**
 * Full SSRF check: resolves the hostname via DNS and treats the URL as
 * private if any resolved address falls inside a private/loopback/
 * metadata range. Use this on every URL the CLI is about to fetch.
 *
 * Note: this is a thin wrapper over `resolveUrl` for callers that only
 * care about the boolean verdict. Callers that go on to actually fetch
 * should use `resolveUrl` + `fetchPinned` to close the DNS-rebinding
 * window between the check and the connection.
 */
export async function isPrivateUrl(url: string): Promise<boolean> {
  const r = await resolveUrl(url);
  return r === null || r.isPrivate;
}

export async function fetchWithTimeout(
  url: string,
  timeout: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } catch (error) {
    if (isNodeError(error) && error.code === 'ABORT_ERR') {
      throw new FetchError(`Request timed out after ${timeout}ms`, 'ETIMEDOUT');
    }
    throw new FetchError(getErrorMessage(error), undefined, { cause: error });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Like `fetchWithTimeout`, but pins the underlying TCP connection to
 * the IP address in `resolution`. This closes the DNS-rebinding TOCTOU
 * window — a hostname cannot resolve to a public IP at check time and
 * a private/metadata IP at connect time.
 *
 * TLS SNI / certificate validation continues to use the URL's hostname.
 */
export async function fetchPinned(
  url: string,
  resolution: UrlResolution,
  timeout: number,
): Promise<Response> {
  if (resolution.isPrivate) {
    throw new FetchError(
      `Refusing to fetch ${url}: resolves to a private, loopback, or ` +
        `cloud-metadata address (${resolution.resolvedAddress}).`,
      'EPRIVATE',
    );
  }

  const dispatcher = new Agent({
    connect: {
      // Pin the address. Node's `lookup` signature is
      // (host, options, callback) → callback(err, address, family).
      // We ignore the requested host and always return our resolved IP.
      lookup: (
        _host: string,
        _opts: LookupOptions,
        cb: (err: NodeJS.ErrnoException | null, address: string, family: number) => void,
      ) => cb(null, resolution.resolvedAddress, resolution.family),
    },
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Cast to unknown then Response because undici's fetch return type
    // is structurally identical to the global Response.
    const response = (await undiciFetch(url, {
      signal: controller.signal,
      dispatcher,
    })) as unknown as Response;
    return response;
  } catch (error) {
    if (isNodeError(error) && error.code === 'ABORT_ERR') {
      throw new FetchError(`Request timed out after ${timeout}ms`, 'ETIMEDOUT');
    }
    throw new FetchError(getErrorMessage(error), undefined, { cause: error });
  } finally {
    clearTimeout(timeoutId);
    // Free the connection pool.
    void dispatcher.close();
  }
}

export function setGlobalProxy(proxy: string) {
  setGlobalDispatcher(new ProxyAgent(proxy));
}

/** Test-only: clear the resolution cache between tests. */
export function _clearResolutionCacheForTests(): void {
  resolutionCache.clear();
}
