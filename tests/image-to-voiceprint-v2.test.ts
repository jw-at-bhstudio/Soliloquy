import test from 'node:test';
import assert from 'node:assert/strict';

import { mapGrayColumnsToVoiceprintV2 } from '../prototypes/image-to-voiceprint/v2-column-scan/main.ts';

test('v2 builds harmonics from vertical band energy instead of gray buckets', () => {
  const columns = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1],
  ];

  const result = mapGrayColumnsToVoiceprintV2(columns, { duration: 10 });

  assert.equal(result.f0[0], 0);
  assert.ok((result.tracks[0]?.amplitudes[1] ?? 0) > 0);
  assert.ok((result.tracks[7]?.amplitudes[2] ?? 0) > 0);
});
