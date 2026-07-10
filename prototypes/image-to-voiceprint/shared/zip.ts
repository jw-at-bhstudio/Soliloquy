export interface ZipEntry {
  name: string;
  bytes: Uint8Array;
}

const crcTable = new Uint32Array(256);

for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[index] = value >>> 0;
}

function setUint16(target: Uint8Array, offset: number, value: number): void {
  new DataView(target.buffer, target.byteOffset, target.byteLength).setUint16(offset, value, true);
}

function setUint32(target: Uint8Array, offset: number, value: number): void {
  new DataView(target.buffer, target.byteOffset, target.byteLength).setUint32(offset, value >>> 0, true);
}

function computeCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

export function createStoredZip(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const fileParts: Uint8Array[] = [];
  const centralDirectory: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc32 = computeCrc32(entry.bytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    localHeader.set(nameBytes, 30);
    setUint32(localHeader, 0, 0x04034b50);
    setUint16(localHeader, 4, 20);
    setUint16(localHeader, 6, 0x0800);
    setUint16(localHeader, 8, 0);
    setUint16(localHeader, 10, 0);
    setUint16(localHeader, 12, 0);
    setUint32(localHeader, 14, crc32);
    setUint32(localHeader, 18, entry.bytes.length);
    setUint32(localHeader, 22, entry.bytes.length);
    setUint16(localHeader, 26, nameBytes.length);
    setUint16(localHeader, 28, 0);
    fileParts.push(localHeader, entry.bytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    centralHeader.set(nameBytes, 46);
    setUint32(centralHeader, 0, 0x02014b50);
    setUint16(centralHeader, 4, 20);
    setUint16(centralHeader, 6, 20);
    setUint16(centralHeader, 8, 0x0800);
    setUint16(centralHeader, 10, 0);
    setUint16(centralHeader, 12, 0);
    setUint16(centralHeader, 14, 0);
    setUint32(centralHeader, 16, crc32);
    setUint32(centralHeader, 20, entry.bytes.length);
    setUint32(centralHeader, 24, entry.bytes.length);
    setUint16(centralHeader, 28, nameBytes.length);
    setUint16(centralHeader, 30, 0);
    setUint16(centralHeader, 32, 0);
    setUint16(centralHeader, 34, 0);
    setUint16(centralHeader, 36, 0);
    setUint32(centralHeader, 38, 0);
    setUint32(centralHeader, 42, offset);
    centralDirectory.push(centralHeader);

    offset += localHeader.length + entry.bytes.length;
  }

  const centralSize = centralDirectory.reduce((total, part) => total + part.length, 0);
  const endRecord = new Uint8Array(22);
  setUint32(endRecord, 0, 0x06054b50);
  setUint16(endRecord, 4, 0);
  setUint16(endRecord, 6, 0);
  setUint16(endRecord, 8, entries.length);
  setUint16(endRecord, 10, entries.length);
  setUint32(endRecord, 12, centralSize);
  setUint32(endRecord, 16, offset);
  setUint16(endRecord, 20, 0);

  return new Blob([...fileParts, ...centralDirectory, endRecord], { type: 'application/zip' });
}
