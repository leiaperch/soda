/**
 * One-shot: pull the base64 baseColour texture out of courier.gltf and write it
 * next to the model as a plain PNG.
 *
 * The Mixamo round trip strips textures, so the rigged FBX arrives with UVs but
 * no image. This recovers the original map so the rigged mesh can wear it.
 *
 *   node tools/extract-texture.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const models = resolve(here, '..', 'public', 'models');

const gltf = JSON.parse(readFileSync(resolve(models, 'courier.gltf'), 'utf8'));
const image = gltf.images && gltf.images[0];
if (!image || !image.uri || !image.uri.startsWith('data:')) {
  throw new Error('courier.gltf has no embedded image to extract');
}

const base64 = image.uri.slice(image.uri.indexOf(',') + 1);
const bytes = Buffer.from(base64, 'base64');
const out = resolve(models, 'courier.png');
writeFileSync(out, bytes);

console.log(`wrote ${out} (${(bytes.length / 1024 / 1024).toFixed(2)} MB, ${image.mimeType})`);
