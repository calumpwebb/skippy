import { atomicWrite } from '@skippy/shared';

const EMBEDDING_MAGIC = 0x454d4244; // "EMBD"
const EMBEDDING_VERSION = 1;

/** Saves embeddings to binary file with header. */
export async function saveEmbeddings(
  embeddings: number[][],
  path: string,
  dimension: number
): Promise<void> {
  const count = embeddings.length;
  const headerSize = 12; // 4 + 2 + 2 + 4 bytes
  const dataSize = count * dimension * 4;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  // Write header
  view.setUint32(0, EMBEDDING_MAGIC, true);
  view.setUint16(4, EMBEDDING_VERSION, true);
  view.setUint16(6, dimension, true);
  view.setUint32(8, count, true);

  // Write data
  const floatView = new Float32Array(buffer, headerSize);
  for (let i = 0; i < embeddings.length; i++) {
    const embedding = embeddings[i];
    if (embedding) {
      floatView.set(embedding, i * dimension);
    }
  }

  await atomicWrite(path, new Uint8Array(buffer));
}

/** Loads embeddings from binary file with header validation. */
export async function loadEmbeddings(
  path: string
): Promise<{ embeddings: number[][]; dimension: number }> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(`Embeddings file not found: ${path}`);
  }

  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);

  // Validate header
  const magic = view.getUint32(0, true);
  if (magic !== EMBEDDING_MAGIC) {
    throw new Error('Invalid embeddings file format');
  }

  const version = view.getUint16(4, true);
  if (version !== EMBEDDING_VERSION) {
    throw new Error(`Unsupported embeddings version: ${version}`);
  }

  const dimension = view.getUint16(6, true);
  const count = view.getUint32(8, true);

  // Validate file size
  const expectedSize = 12 + count * dimension * 4;
  if (buffer.byteLength !== expectedSize) {
    throw new Error('Embeddings file corrupted: size mismatch');
  }

  const floatView = new Float32Array(buffer, 12);
  const embeddings: number[][] = [];
  for (let i = 0; i < count; i++) {
    embeddings.push(Array.from(floatView.slice(i * dimension, (i + 1) * dimension)));
  }

  return { embeddings, dimension };
}

/** Saves ID index to JSON file. */
export async function saveIndex(ids: string[], path: string): Promise<void> {
  await Bun.write(path, JSON.stringify(ids, null, 2));
}

/** Loads ID index from JSON file. */
export async function loadIndex(path: string): Promise<string[]> {
  const file = Bun.file(path);
  const content = await file.text();
  return JSON.parse(content);
}
