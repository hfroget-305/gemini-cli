/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from '../../../test-utils/render.js';
import { UserShellMessage } from './UserShellMessage.js';
import { describe, it, expect } from 'vitest';

describe('UserShellMessage', () => {
  it('renders correctly with default settings', () => {
    const { lastFrame } = render(<UserShellMessage text="ls -la" />);
    const output = lastFrame();

    expect(output).toContain('$ ');
    expect(output).toContain('ls -la');
    expect(output).toMatchSnapshot();
  });

  it('strips leading exclamation mark from text', () => {
    const { lastFrame } = render(<UserShellMessage text="!npm test" />);
    const output = lastFrame();

    expect(output).toContain('$ ');
    expect(output).toContain('npm test');
    expect(output).not.toContain('!npm test');
    expect(output).toMatchSnapshot();
  });
});
