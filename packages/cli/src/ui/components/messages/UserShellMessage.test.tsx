/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from '../../../test-utils/render.js';
import { UserShellMessage } from './UserShellMessage.js';
import { describe, it, expect, vi } from 'vitest';

describe('UserShellMessage', () => {
  it('renders shell command with correct prefix', () => {
    const { lastFrame } = render(<UserShellMessage text="ls -la" />);
    const output = lastFrame();
    expect(output).toContain('$');
    expect(output).toContain('ls -la');
  });

  it('strips leading exclamation mark', () => {
    const { lastFrame } = render(<UserShellMessage text="!npm start" />);
    const output = lastFrame();
    expect(output).toContain('$');
    expect(output).toContain('npm start');
    expect(output).not.toContain('!npm start');
  });
});
