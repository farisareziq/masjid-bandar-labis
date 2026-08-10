/* ============================================================
   Pembaca tempoh MP4 (moov/mvhd) - tanpa dependency luar
   Guna untuk semak had tempoh video TikTok sebelum upload.
   ============================================================ */
"use strict";

const fs = require("fs");

function openBox(fd, offset, fileSize) {
  const head = Buffer.alloc(16);
  const n = fs.readSync(fd, head, 0, 8, offset);
  if (n < 8) return null;
  let size = head.readUInt32BE(0);
  const type = head.toString("ascii", 4, 8);
  let header = 8;
  if (size === 1) {
    fs.readSync(fd, head, 8, 8, offset + 8);
    const hi = head.readUInt32BE(8);
    const lo = head.readUInt32BE(12);
    size = hi * 0x100000000 + lo;
    header = 16;
  } else if (size === 0) {
    size = fileSize - offset;
  }
  return {
    type: type,
    size: size,
    header: header,
    contentStart: offset + header,
    contentEnd: offset + size,
  };
}

function children(fd, start, end) {
  const out = [];
  let off = start;
  while (off + 8 <= end) {
    const b = openBox(fd, off, end);
    if (!b || b.size <= 0) break;
    out.push(b);
    off = b.contentEnd;
  }
  return out;
}

// Pulangkan tempoh dalam saat, atau null jika tidak dapat dibaca
function durationSeconds(filePath) {
  const fd = fs.openSync(filePath, "r");
  try {
    const fileSize = fs.fstatSync(fd).size;
    const top = children(fd, 0, fileSize);
    const moov = top.find(function (b) {
      return b.type === "moov";
    });
    if (!moov) return null;
    const inner = children(fd, moov.contentStart, moov.contentEnd);
    const mvhd = inner.find(function (b) {
      return b.type === "mvhd";
    });
    if (!mvhd) return null;
    const buf = Buffer.alloc(32);
    fs.readSync(fd, buf, 0, 32, mvhd.contentStart);
    const version = buf.readUInt8(0);
    let timescale = 0;
    let duration = 0;
    if (version === 1) {
      timescale = buf.readUInt32BE(20);
      duration = Number(buf.readBigUInt64BE(24));
    } else {
      timescale = buf.readUInt32BE(12);
      duration = buf.readUInt32BE(16);
    }
    if (!timescale) return null;
    return duration / timescale;
  } finally {
    fs.closeSync(fd);
  }
}

module.exports = { durationSeconds: durationSeconds };
