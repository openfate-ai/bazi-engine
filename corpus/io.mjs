import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { pipeline } from 'node:stream/promises';
import { createGunzip, createGzip } from 'node:zlib';

export async function writeGzipLines(path, rows, expected) {
  await mkdir(dirname(path), { recursive: true });
  const stage = await mkdtemp(join(dirname(path), '.writing-'));
  const temporary = join(stage, 'data');
  let count = 0;
  async function* lines() {
    for await (const row of rows) {
      count++;
      yield JSON.stringify(row) + '\n';
    }
    if (count !== expected) throw new Error('Unexpected row count at ' + path + ': ' + count);
  }
  try {
    await pipeline(lines(), createGzip({ level: 4 }), createWriteStream(temporary, { flags: 'wx' }));
    await rename(temporary, path);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

export async function* readGzipLines(path) {
  const gunzip = createGunzip();
  const stream = pipeline(createReadStream(path), gunzip);
  // Propagate a bad gzip header or disk error even if parsing also fails.
  stream.catch(() => {});
  try {
    for await (const line of createInterface({ input: gunzip, crlfDelay: Infinity })) {
      yield JSON.parse(line);
    }
    await stream;
  } finally {
    gunzip.destroy();
    await stream.catch(() => {});
  }
}
