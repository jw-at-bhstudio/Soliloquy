import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const prototypeDir = path.resolve(process.cwd(), 'prototypes/ce-re');

test('ce-re prototype directory keeps only the final trio artifacts', () => {
  const entries = readdirSync(prototypeDir, { withFileTypes: true })
    .map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  assert.deepEqual(entries, [
    { name: 'dataset.json', isDirectory: false },
    { name: 'distribution.html', isDirectory: false },
    { name: 'questionnaire.html', isDirectory: false },
  ]);
});

test('ce-re prototype directory no longer contains transitional shared or data folders', () => {
  assert.equal(existsSync(path.join(prototypeDir, 'shared')), false);
  assert.equal(existsSync(path.join(prototypeDir, 'data')), false);
});
