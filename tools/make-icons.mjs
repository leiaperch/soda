/**
 * Generates the PWA icons as PNGs, with no image library.
 *
 * Node ships zlib, and a PNG is just a signature plus three chunks, so the
 * whole encoder is forty lines. That beats adding a dependency, and it means
 * the icon is reproducible from source rather than a binary nobody can edit.
 *
 *   node tools/make-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '..', 'public');

// ---------- minimal PNG encoder ------------------------------------------

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** @param {Uint8Array} rgba - size*size*4 */
function encodePng(size, rgba) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- the icon itself ----------------------------------------------

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

const SKY = hex('#8fe0ff');
const PINK = hex('#ff3fa4');
const DEEP = hex('#5a1a8a');

/**
 * A four-point sparkle is an astroid: sqrt(|x|) + sqrt(|y|) <= 1. Nothing else
 * gives that concave Y2K star shape in one line of maths.
 */
function sparkle(x, y, r) {
  if (r <= 0) return false;
  return Math.sqrt(Math.abs(x) / r) + Math.sqrt(Math.abs(y) / r) <= 1;
}

/** Returns [r,g,b,a] for one supersample at canvas coords. */
function sample(px, py, size, maskable) {
  const s = size;
  const x = px / s;   // 0..1
  const y = py / s;

  // rounded square mask (skipped for maskable, which must bleed to the edge)
  const inset = maskable ? 0 : 0.055;
  const radius = 0.235;
  if (!maskable) {
    const cx = Math.min(Math.max(x, inset + radius), 1 - inset - radius);
    const cy = Math.min(Math.max(y, inset + radius), 1 - inset - radius);
    const dx = x - cx;
    const dy = y - cy;
    if (x < inset || x > 1 - inset || y < inset || y > 1 - inset) return [0, 0, 0, 0];
    if (dx * dx + dy * dy > radius * radius) return [0, 0, 0, 0];
  }

  // background: blue at the top falling to pink, the same ramp as the logo
  let col = y < 0.52 ? mix(SKY, PINK, y / 0.52) : mix(PINK, DEEP, (y - 0.52) / 0.48);

  // gloss across the top half, the Aqua highlight
  if (y < 0.44) col = mix(col, [255, 255, 255], (1 - y / 0.44) * 0.42);

  // big sparkle, slightly above centre
  if (sparkle(x - 0.5, y - 0.46, 0.34)) col = [255, 255, 255];
  // two small companions
  if (sparkle(x - 0.76, y - 0.24, 0.11)) col = [255, 255, 255];
  if (sparkle(x - 0.26, y - 0.72, 0.085)) col = mix(PINK, [255, 255, 255], 0.65);

  return [col[0], col[1], col[2], 255];
}

function render(size, maskable) {
  const rgba = new Uint8Array(size * size * 4);
  const SS = 3; // supersampling, because there is no anti-aliasing for free
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = sample(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS, size, maskable);
          r += c[0] * c[3]; g += c[1] * c[3]; b += c[2] * c[3]; a += c[3];
        }
      }
      const i = (y * size + x) * 4;
      if (a > 0) {
        rgba[i] = Math.round(r / a);
        rgba[i + 1] = Math.round(g / a);
        rgba[i + 2] = Math.round(b / a);
      }
      rgba[i + 3] = Math.round(a / (SS * SS));
    }
  }
  return encodePng(size, rgba);
}

for (const [name, size, maskable] of [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
  ['favicon-64.png', 64, false],
]) {
  const png = render(size, maskable);
  writeFileSync(resolve(out, name), png);
  console.log(`wrote public/${name} (${(png.length / 1024).toFixed(1)} kB)`);
}
