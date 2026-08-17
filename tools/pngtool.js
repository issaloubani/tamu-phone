/*
 * Minimal PNG decode/encode for 8-bit RGBA, non-interlaced. zlib is built into node,
 * so this needs no dependencies. Enough to crop and area-average resize a portrait.
 */
const fs = require("fs");
const zlib = require("zlib");

// ---- CRC32 -----------------------------------------------------------------
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
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

// ---- decode ----------------------------------------------------------------
function decodePNG(file) {
    const buf = fs.readFileSync(file);
    if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a png");

    let pos = 8, width = 0, height = 0, bitDepth = 0, colorType = 0;
    const idat = [];
    while (pos < buf.length) {
        const len = buf.readUInt32BE(pos);
        const type = buf.toString("ascii", pos + 4, pos + 8);
        const data = buf.slice(pos + 8, pos + 8 + len);
        if (type === "IHDR") {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            bitDepth = data[8];
            colorType = data[9];
            if (data[12] !== 0) throw new Error("interlaced png unsupported");
        } else if (type === "IDAT") {
            idat.push(data);
        } else if (type === "IEND") break;
        pos += 12 + len;
    }
    if (bitDepth !== 8) throw new Error("only 8-bit supported, got " + bitDepth);
    const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
    if (!channels) throw new Error("unsupported colorType " + colorType);

    const raw = zlib.inflateSync(Buffer.concat(idat));
    const bpp = channels;
    const stride = width * bpp;
    const out = Buffer.alloc(width * height * 4);
    let prev = Buffer.alloc(stride);

    for (let y = 0; y < height; y++) {
        const filter = raw[y * (stride + 1)];
        const line = Buffer.from(raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1)));

        for (let i = 0; i < stride; i++) {
            const a = i >= bpp ? line[i - bpp] : 0;
            const b = prev[i];
            const c = i >= bpp ? prev[i - bpp] : 0;
            let v = line[i];
            if (filter === 1) v += a;
            else if (filter === 2) v += b;
            else if (filter === 3) v += (a + b) >> 1;
            else if (filter === 4) {
                const p = a + b - c;
                const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
                v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
            }
            line[i] = v & 0xff;
        }

        for (let x = 0; x < width; x++) {
            const s = x * bpp, d = (y * width + x) * 4;
            if (channels === 4) { out[d] = line[s]; out[d+1] = line[s+1]; out[d+2] = line[s+2]; out[d+3] = line[s+3]; }
            else if (channels === 3) { out[d] = line[s]; out[d+1] = line[s+1]; out[d+2] = line[s+2]; out[d+3] = 255; }
            else if (channels === 2) { out[d] = out[d+1] = out[d+2] = line[s]; out[d+3] = line[s+1]; }
            else { out[d] = out[d+1] = out[d+2] = line[s]; out[d+3] = 255; }
        }
        prev = line;
    }
    return { width, height, data: out };
}

// ---- encode ----------------------------------------------------------------
function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td), 0);
    return Buffer.concat([len, td, crc]);
}

function encodePNG(img, file) {
    const { width, height, data } = img;
    const stride = width * 4;
    const raw = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y++) {
        raw[y * (stride + 1)] = 0; // filter: none
        data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

    fs.writeFileSync(file, Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk("IHDR", ihdr),
        chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
        chunk("IEND", Buffer.alloc(0))
    ]));
}

// ---- helpers ---------------------------------------------------------------

/* Bounding box of pixels that are neither transparent nor near-white. */
function contentBounds(img, whiteCut = 245) {
    let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            const d = (y * img.width + x) * 4;
            const a = img.data[d + 3];
            if (a < 8) continue;
            const isWhite = img.data[d] >= whiteCut && img.data[d+1] >= whiteCut && img.data[d+2] >= whiteCut;
            if (isWhite) continue;
            if (x < x0) x0 = x;
            if (y < y0) y0 = y;
            if (x > x1) x1 = x;
            if (y > y1) y1 = y;
        }
    }
    if (x1 < 0) return { x: 0, y: 0, w: img.width, h: img.height };
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/*
 * Area-average resize of a source rectangle into a new image. Correct choice here:
 * the source is pixel art rendered at 2000px, so each logical pixel covers a large
 * block and averaging recovers it cleanly instead of aliasing thin lines away.
 */
function resizeRegion(img, rect, dw, dh) {
    const out = Buffer.alloc(dw * dh * 4);
    const sx = rect.w / dw, sy = rect.h / dh;
    for (let y = 0; y < dh; y++) {
        const ys = rect.y + y * sy, ye = rect.y + (y + 1) * sy;
        const y0 = Math.floor(ys), y1 = Math.min(img.height, Math.ceil(ye));
        for (let x = 0; x < dw; x++) {
            const xs = rect.x + x * sx, xe = rect.x + (x + 1) * sx;
            const x0 = Math.floor(xs), x1 = Math.min(img.width, Math.ceil(xe));
            let r = 0, g = 0, b = 0, a = 0, n = 0;
            for (let j = y0; j < y1; j++) {
                for (let i = x0; i < x1; i++) {
                    const d = (j * img.width + i) * 4;
                    const al = img.data[d + 3] / 255;
                    r += img.data[d] * al; g += img.data[d+1] * al; b += img.data[d+2] * al;
                    a += img.data[d + 3];
                    n++;
                }
            }
            const d = (y * dw + x) * 4;
            if (n === 0) continue;
            const aw = a / 255;
            out[d]     = aw > 0 ? Math.round(r / aw) : 0;
            out[d + 1] = aw > 0 ? Math.round(g / aw) : 0;
            out[d + 2] = aw > 0 ? Math.round(b / aw) : 0;
            out[d + 3] = Math.round(a / n);
        }
    }
    return { width: dw, height: dh, data: out };
}

function blank(w, h) {
    return { width: w, height: h, data: Buffer.alloc(w * h * 4) };
}

/* Composite src into dst at (dx, dy), source-over. */
function blit(dst, src, dx, dy) {
    for (let y = 0; y < src.height; y++) {
        for (let x = 0; x < src.width; x++) {
            const s = (y * src.width + x) * 4;
            const ty = dy + y, tx = dx + x;
            if (ty < 0 || tx < 0 || ty >= dst.height || tx >= dst.width) continue;
            const d = (ty * dst.width + tx) * 4;
            const sa = src.data[s + 3] / 255;
            if (sa === 0) continue;
            for (let c = 0; c < 3; c++) {
                dst.data[d + c] = Math.round(src.data[s + c] * sa + dst.data[d + c] * (1 - sa));
            }
            dst.data[d + 3] = Math.round(src.data[s + 3] + dst.data[d + 3] * (1 - sa));
        }
    }
}

module.exports = { decodePNG, encodePNG, contentBounds, resizeRegion, blank, blit };
