import assert from 'node:assert/strict';
import test from 'node:test';
import { parseThemeName, themes } from './tokens.ts';

test('restores only supported theme names and defaults safely', () => {
  assert.equal(parseThemeName('dark'), 'dark');
  assert.equal(parseThemeName('light'), 'light');
  assert.equal(parseThemeName('system'), 'light');
  assert.equal(parseThemeName(null), 'light');
});

test('defines distinct semantic palettes for both appearances', () => {
  assert.notEqual(themes.light.colors.canvas, themes.dark.colors.canvas);
  assert.notEqual(themes.light.colors.text, themes.dark.colors.text);
  assert.equal(themes.light.dark, false);
  assert.equal(themes.dark.dark, true);
});
