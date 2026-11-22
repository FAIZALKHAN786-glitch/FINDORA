import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('embedder uses one local quantized model with a local cache', () => {
  const pkg = JSON.parse(read('package.json'));
  const src = read('server/embedder.js');
  assert.equal(pkg.dependencies['@huggingface/transformers'], '^4.3.2');
  assert.match(src, /Xenova\/all-MiniLM-L6-v2/);
  assert.match(src, /dtype:\s*['"]q8['"]/);
  assert.match(src, /pooling:\s*['"]mean['"]/);
  assert.match(src, /normalize:\s*true/);
  assert.match(src, /FINDORA_MODEL_CACHE/);
  assert.doesNotMatch(src, /https?:\/\/api\./);
});
