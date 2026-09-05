// 生成 electron/tray.png（托盘图标）与 build/icon.ico（exe/窗口图标）。
// 纯 Node 实现：超采样绘制 → PNG 编码；ICO 采用 256px PNG-in-ICO 条目。
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1
  return c >>> 0
})
const crc32 = buf => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
const encodePng = (size, rgba) => {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const stride = size * 4 + 1
  const raw = Buffer.alloc(size * stride)
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const lerp = (a, b, t) => a + (b - a) * t
const distToSeg = (px, py, x1, y1, x2, y2) => {
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy || 1
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}
const distToCheck = (px, py) => Math.min(
  distToSeg(px, py, 0.28, 0.53, 0.45, 0.69),
  distToSeg(px, py, 0.45, 0.69, 0.74, 0.34),
)

function render(size) {
  const ss = 4
  const rgba = Buffer.alloc(size * size * 4)
  const radius = 0.26
  const stroke = 0.1
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, covered = 0
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const px = (x * ss + sx + 0.5) / (size * ss)
          const py = (y * ss + sy + 0.5) / (size * ss)
          const rx = Math.max(Math.abs(px - 0.5) - (0.46 - radius), 0)
          const ry = Math.max(Math.abs(py - 0.5) - (0.46 - radius), 0)
          if (Math.hypot(rx, ry) > radius) continue
          let cr = lerp(0x27, 0x06, py)
          let cg = lerp(0x96, 0x69, py)
          let cb = lerp(0xff, 0xef, py)
          if (distToCheck(px, py) <= stroke / 2) { cr = 255; cg = 255; cb = 255 }
          r += cr; g += cg; b += cb; covered++
        }
      }
      const i = (y * size + x) * 4
      rgba[i + 3] = Math.round(covered / (ss * ss) * 255)
      if (covered) {
        rgba[i] = Math.round(r / covered)
        rgba[i + 1] = Math.round(g / covered)
        rgba[i + 2] = Math.round(b / covered)
      }
    }
  }
  return rgba
}

const pngToIco = png => {
  const head = Buffer.alloc(6)
  head.writeUInt16LE(1, 2)
  head.writeUInt16LE(1, 4)
  const entry = Buffer.alloc(16)
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(png.length, 8)
  entry.writeUInt32LE(6 + 16, 12)
  return Buffer.concat([head, entry, png])
}

mkdirSync(join(root, 'build'), { recursive: true })
const trayPng = encodePng(32, render(32))
const appIco = pngToIco(encodePng(256, render(256)))
writeFileSync(join(root, 'electron', 'tray.png'), trayPng)
writeFileSync(join(root, 'build', 'icon.ico'), appIco)
console.log(`tray.png ${trayPng.length}B, icon.ico ${appIco.length}B`)
