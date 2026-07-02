import test from 'node:test';
import assert from 'node:assert/strict';

import { mapGrayColumnsToVoiceprintV3 } from '../prototypes/image-to-voiceprint/v3-global-hybrid/main.ts';

test('v3 applies global envelope and tilt on top of local mapping', () => {
  const columns = [
    [0.1, 0.1, 0.1, 0.1],
    [0.8, 0.9, 1, 1],
    [0.8, 0.9, 1, 1],
    [0.1, 0.1, 0.1, 0.1],
  ];

  const result = mapGrayColumnsToVoiceprintV3(columns, { duration: 10 });

  assert.equal(result.sampleCount, 4);
  assert.ok((result.tracks[0]?.amplitudes[1] ?? 0) > (result.tracks[0]?.amplitudes[0] ?? 0));
  assert.ok((result.tracks[7]?.amplitudes[1] ?? 0) >= 0);
});
