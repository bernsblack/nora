import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { DAY_PALETTE } from "../src/design/room-theme";

/**
 * Writes the room device's app icons. `pnpm run icons`.
 *
 * These are placeholders on purpose rather than for want of effort. PROJECT.md
 * section 13 says the brand is unresolved and that nothing user facing may
 * hardcode a product name, so a designed mark cannot exist yet. What can exist
 * is something neutral, warm, and drawn from the room palette rather than from
 * a stock icon set: a filled circle in primary ink on the day surface.
 *
 * Replace both when there is a real brand. Nothing else depends on their shape.
 */

const SIZES = [192, 512];
const OUT_DIR = "public/icons";

function rgb(hex: string): [number, number, number] {
  const value = hex.replace(/^#/, "");
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16)) as [
    number,
    number,
    number,
  ];
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

function png(size: number): Buffer {
  const [sr, sg, sb] = rgb(DAY_PALETTE.surface);
  const [ir, ig, ib] = rgb(DAY_PALETTE.ink);
  const centre = (size - 1) / 2;
  // Generous margin, because Android masks icons to a circle or a squircle and
  // anything near the edge gets cut.
  const radius = size * 0.3;

  const raw = Buffer.alloc(size * (size * 3 + 1));
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // no per scanline filter
    for (let x = 0; x < size; x++) {
      const inside = (x - centre) ** 2 + (y - centre) ** 2 <= radius ** 2;
      raw[offset++] = inside ? ir : sr;
      raw[offset++] = inside ? ig : sg;
      raw[offset++] = inside ? ib : sb;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const file = `${OUT_DIR}/room-${size}.png`;
  writeFileSync(file, png(size));
  console.log(`wrote ${file}`);
}
