import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getImageVoiceprintToolUrl,
  IMAGE_VOICEPRINT_V1_URL,
} from '../src/features/analyzer/utils/imageVoiceprintTool';

test('image voiceprint tool url is stable', () => {
  assert.equal(IMAGE_VOICEPRINT_V1_URL, '/prototypes/image-to-voiceprint/v1-gray-8/');
  assert.equal(getImageVoiceprintToolUrl(), '/prototypes/image-to-voiceprint/v1-gray-8/');
});

