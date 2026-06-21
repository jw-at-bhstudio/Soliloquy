import test from 'node:test';
import assert from 'node:assert/strict';

import { generateStandaloneSVGString } from '../src/features/mirror/utils/coordinateCalculators';

test('mirror SVG export includes the radiusMax guide circle and keeps each track as independent 1px paths', () => {
  const svg = generateStandaloneSVGString(
    [
      {
        harmonicOrder: 1,
        leftPoints: [
          { x: 100, y: 50 },
          { x: 80, y: 100 },
        ],
        rightPoints: [
          { x: 100, y: 150 },
          { x: 120, y: 100 },
        ],
      },
      {
        harmonicOrder: 3,
        leftPoints: [
          { x: 95, y: 55 },
          { x: 85, y: 100 },
        ],
        rightPoints: [],
      },
    ],
    200,
    200,
    70,
  );

  assert.match(svg, /<circle[^>]*cx="100"[^>]*cy="100"[^>]*r="70"[^>]*stroke="#000000"[^>]*stroke-width="1"/);
  assert.equal((svg.match(/<path /g) ?? []).length, 3);
  assert.equal((svg.match(/stroke-width="1"/g) ?? []).length, 4);
  assert.doesNotMatch(svg, /<line /);
  assert.match(svg, /class="left-track-1"/);
  assert.match(svg, /class="right-track-1"/);
  assert.match(svg, /class="left-track-3"/);
});
