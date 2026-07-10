export const IMAGE_VOICEPRINT_TOOL_URL = '/prototypes/image-to-voiceprint/v1-gray-8/';

export function getImageVoiceprintToolUrl(config: { mode?: 'v1' | 'v4' } = {}): string {
  const mode = config.mode ?? 'v4';
  return `${IMAGE_VOICEPRINT_TOOL_URL}?mode=${mode}`;
}
