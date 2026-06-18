import { StoredVoiceprintRecord } from './types';

const STORAGE_KEY = 'soliloquy-voiceprints';
const LEGACY_STORAGE_KEYS = ['veritas-unified-voiceprints'];

function readAll(): StoredVoiceprintRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      LEGACY_STORAGE_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(records: StoredVoiceprintRecord[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function listStoredVoiceprints() {
  return readAll();
}

export function getStoredVoiceprint(id: string) {
  return readAll().find((record) => record.id === id) ?? null;
}

export function saveStoredVoiceprint(record: StoredVoiceprintRecord) {
  const records = readAll().filter((item) => item.id !== record.id);
  records.unshift(record);
  writeAll(records.slice(0, 200));
}
