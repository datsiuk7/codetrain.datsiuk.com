import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = async (name) => readFile(new URL(`../${name}`, import.meta.url), 'utf8');
const rule = (source, selector) => {
  const start = source.indexOf(`${selector} {`);
  assert.ok(start >= 0, `${selector} exists`);
  return source.slice(start, source.indexOf('}', start));
};

test('program fields stretch by the corner and the sticky panel scrolls instead of squeezing them', async () => {
  const game = await css('game.css');
  const blocks = await css('blocks.css');
  assert.match(game, /\.program-panel \.program,\s*\.code-editor \{\s*resize: vertical;/);
  assert.match(blocks, /\.program-panel \.function-card \.code-body \{\s*resize: vertical;/);
  assert.match(rule(game, '.program-panel .program'), /flex: 0 0 auto;/, 'a dragged height is not squeezed back');
  assert.match(rule(game, '.program-panel'), /overflow-y: auto;/, 'the panel scrolls to a stretched field');
  assert.match(rule(blocks, '.code-library'), /flex-shrink: 0;/);
  assert.doesNotMatch(rule(blocks, '.code-library'), /max-height|overflow/, 'the library grows with a stretched function');
});

test('the mouse wheel over a program field always reaches the panel and the page', async () => {
  for (const name of ['game.css', 'blocks.css']) {
    assert.doesNotMatch(await css(name), /overscroll-behavior:\s*contain/, `${name}: no field traps the wheel`);
  }
});
