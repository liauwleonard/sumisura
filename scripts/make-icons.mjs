/**
 * Generates the PWA icons from the same shapes as public/icon.svg.
 * Run with: node scripts/make-icons.mjs
 *
 * Hand-rolled rather than pulling in a raster dependency — the icon is three shapes and
 * this keeps the build free of native modules.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const BG = [180, 83, 9] // amber-700 #b45309
const FG = [255, 255, 255]

// Geometry in a 512x512 space, matching public/icon.svg.
const STROKE = 46
const V = [
  [[150, 128], [256, 322]],
  [[256, 322], [362, 128]],
]
const BUTTON = { x: 256, y: 398, r: 27 }

/** Shortest distance from p to segment ab — gives us round caps and joins for free. */
function distToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/** Coverage of the white foreground at a point, antialiased over one pixel. */
function coverage(x, y, scale) {
  const px = x / scale
  const py = y / scale
  let d = Math.min(
    ...V.map(([a, b]) => distToSegment(px, py, a, b) - STROKE / 2),
    Math.hypot(px - BUTTON.x, py - BUTTON.y) - BUTTON.r,
  )
  const aa = 0.75 / scale // feather roughly one output pixel
  return Math.max(0, Math.min(1, 0.5 - d / (2 * aa)))
}

function crc32(buf) {
  let c
  const table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size) {
  const scale = size / 512
  // Raw scanlines: one filter byte (0 = none) then RGB triples.
  const raw = Buffer.alloc(size * (1 + size * 3))
  let o = 0
  for (let y = 0; y < size; y++) {
    raw[o++] = 0
    for (let x = 0; x < size; x++) {
      const a = coverage(x + 0.5, y + 0.5, scale)
      for (let c = 0; c < 3; c++) raw[o++] = Math.round(BG[c] * (1 - a) + FG[c] * a)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const [name, size] of [
  ['pwa-512x512.png', 512],
  ['pwa-192x192.png', 192],
  ['apple-touch-icon.png', 180],
  ['favicon.png', 48],
]) {
  writeFileSync(join(OUT, name), png(size))
  console.log(`wrote ${name} (${size}x${size})`)
}
