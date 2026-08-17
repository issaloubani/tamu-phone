/*
 * Turn a flat-colour line drawing on a neutral background into a transparent PNG.
 *
 * Gemini hands back a JPEG with the transparency checkerboard painted into it. The
 * checkerboard is neutral grey, the artwork is a single saturated colour, so they separate
 * perfectly on chroma: max(r,g,b) - min(r,g,b). Grey is ~0, the ink is ~50.
 *
 * No background-removal service involved. This is exact, offline, and better on pixel art
 * than a segmentation model, which will happily eat a one-pixel whisker.
 *
 *   node clean_art.js <in.jpg|in.png> <out.png> [--ink 5C8F6B]
 */
const fs = require("fs");
const path = require("path");
const t = require(path.join(__dirname, "pngtool.js"));

const LO = 10;   // chroma at or below this is background
const HI = 40;   // chroma at or above this is solid ink

function decode(file) {
    if (/\.png$/i.test(file)) return t.decodePNG(file);

    const jpeg = require("jpeg-js");
    const raw = jpeg.decode(fs.readFileSync(file), { useTArray: true });
    return { width: raw.width, height: raw.height, data: Buffer.from(raw.data) };
}

const [inFile, outFile, ...rest] = process.argv.slice(2);
if (!inFile || !outFile) {
    console.error("usage: node clean_art.js <in.jpg|in.png> <out.png> [--ink RRGGBB]");
    process.exit(1);
}

const inkArg = rest.includes("--ink") ? rest[rest.indexOf("--ink") + 1] : "5C8F6B";
const ink = [0, 2, 4].map(i => parseInt(inkArg.substr(i, 2), 16));

const img = decode(inFile);
const out = Buffer.alloc(img.width * img.height * 4);

let kept = 0, partial = 0;
for (let i = 0; i < img.width * img.height; i++) {
    const d = i * 4;
    const r = img.data[d], g = img.data[d + 1], b = img.data[d + 2];

    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    let a = (chroma - LO) / (HI - LO);
    a = Math.max(0, Math.min(1, a));

    // Snap every surviving pixel to the exact ink colour. JPEG compression smears the
    // green around the edges and we do not want that variation in the final sheet.
    out[d] = ink[0];
    out[d + 1] = ink[1];
    out[d + 2] = ink[2];
    out[d + 3] = Math.round(a * 255);

    if (a >= 1) kept++;
    else if (a > 0) partial++;
}

t.encodePNG({ width: img.width, height: img.height, data: out }, outFile);

const total = img.width * img.height;
console.log(
    `${path.basename(inFile)} -> ${path.basename(outFile)}  ${img.width}x${img.height}  ` +
    `solid ${kept} (${(kept / total * 100).toFixed(1)}%), edge ${partial}, ` +
    `transparent ${(100 - (kept + partial) / total * 100).toFixed(1)}%`
);
