/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { UserShellMessage } from './UserShellMessage.js';
import { render } from '../../../test-utils/render.js';

describe('UserShellMessage', () => {
  it('renders with the correct prefix and text', () => {
    const { lastFrame } = render(<UserShellMessage text="ls -la" />);
    const output = lastFrame();
    expect(output).toContain('$ ');
    expect(output).toContain('ls -la');
  });

  it('removes leading ! from command', () => {
    const { lastFrame } = render(<UserShellMessage text="!npm run start" />);
    const output = lastFrame();
    expect(output).toContain('$ ');
    expect(output).toContain('npm run start');
    expect(output).not.toContain('!npm');
  });
});
