/**
 * Cosine similarity + binary packing for persisted embedding vectors.
 */

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export function packFloat32(values: number[]): Buffer {
  const buf = Buffer.allocUnsafe(values.length * 4);
  for (let i = 0; i < values.length; i++) {
    buf.writeFloatLE(values[i], i * 4);
  }
  return buf;
}

export function unpackFloat32(buf: Buffer): number[] {
  const n = Math.floor(buf.length / 4);
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    out[i] = buf.readFloatLE(i * 4);
  }
  return out;
}

export function hashContent(text: string): string {
  // FNV-1a 32-bit — good enough for reindex skip detection
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
