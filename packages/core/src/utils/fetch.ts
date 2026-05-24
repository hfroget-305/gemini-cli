/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { getErrorMessage, isNodeError } from './errors.js';
import { URL } from 'node:url';
import * as dns from 'node:dns/promises';
import * as net from 'node:net';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

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
  // 100.64.0.0/10 — carrier-grade NAT (RFC 6598)
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
  const v4MappedMatch = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4MappedMatch) return isPrivateIPv4(v4MappedMatch[1]);
  // fc00::/7 — unique local addresses (covers fc00:..fdff:)
  if (/^f[cd][0-9a-f]{2}:/i.test(lower)) return true;
  // fe80::/10 — link-local
  if (/^fe[89ab][0-9a-f]:/i.test(lower)) return true;
  // ff00::/8 — multicast
  if (/^ff[0-9a-f]{2}:/i.test(lower)) return true;
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
 * hostname that resolves to a private IP), call `isPrivateUrl` instead.
 */
export function isPrivateIp(url: string): boolean {
  try {
    return isPrivateLiteral(new URL(url).hostname);
  } catch (_e) {
    return false;
  }
}

/**
 * Full SSRF check: resolves the hostname via DNS and treats the URL as
 * private if any resolved address falls inside a private/loopback/
 * metadata range. Use this on every URL the CLI is about to fetch.
 */
export async function isPrivateUrl(url: string): Promise<boolean> {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return false;
  }
  if (isPrivateLiteral(hostname)) return true;

  const stripped = hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;
  if (net.isIP(stripped) !== 0) {
    // Pure IP literal already handled by isPrivateLiteral.
    return false;
  }

  try {
    const addrs = await dns.lookup(hostname, { all: true, verbatim: true });
    return addrs.some((a) =>
      a.family === 6 ? isPrivateIPv6(a.address) : isPrivateIPv4(a.address),
    );
  } catch {
    // If DNS fails, fail safe: treat as private/unknown so the caller
    // refuses rather than silently fetching an arbitrary endpoint.
    return true;
  }
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

export function setGlobalProxy(proxy: string) {
  setGlobalDispatcher(new ProxyAgent(proxy));
}
