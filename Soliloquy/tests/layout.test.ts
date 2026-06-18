import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAppShellViewportClassName,
  getScrollableColumnClassName,
  getWorkspaceViewportClassName,
} from '../src/shared/ui/layout';

test('app shell viewport keeps route area shrinkable and clipped inside browser viewport', () => {
  const className = getAppShellViewportClassName();

  assert.match(className, /\bflex-1\b/);
  assert.match(className, /\bmin-h-0\b/);
  assert.match(className, /\boverflow-hidden\b/);
});

test('workspace viewport uses full available height without creating another screen-sized root', () => {
  const className = getWorkspaceViewportClassName();

  assert.match(className, /\bh-full\b/);
  assert.match(className, /\bmin-h-0\b/);
  assert.match(className, /\boverflow-hidden\b/);
  assert.doesNotMatch(className, /\bh-screen\b/);
  assert.doesNotMatch(className, /\bmin-h-screen\b/);
});

test('scrollable columns scroll internally instead of stretching the whole page vertically', () => {
  const className = getScrollableColumnClassName();

  assert.match(className, /\bmin-h-0\b/);
  assert.match(className, /\boverflow-y-auto\b/);
});
