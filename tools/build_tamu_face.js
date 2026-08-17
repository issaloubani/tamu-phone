/*
 * Builds an OMORI face sheet from one PNG per expression.
 *
 * OMORI draws faces as a grid of 106x106 cells, 4 per row, indexed
 * row * 4 + column (Omori BASE.js:3307, GTP_OmoriFixes.js:851). Each source image is
 * cropped to its visible content and area-averaged down to fit a cell.
 *
 *   node build_tamu_face.js <out.png> <neutral.png> [happy.png] [annoyed.png] ...
 */
const path = require("path");
const t = require(path.join(__dirname, "pngtool.js"));

const CELL = 106;
const PAD = 3;          // breathing room inside the cell
const COLUMNS = 4;

const [outFile, ...sources] = process.argv.slice(2);
if (!outFile || sources.length === 0) {
    console.error("usage: node build_tamu_face.js <out.png> <src.png> [src.png ...]");
    process.exit(1);
}

// Always emit whole rows of 4 so every index in the sheet is a real cell.
const rows = Math.ceil(sources.length / COLUMNS);
const sheet = t.blank(CELL * COLUMNS, CELL * rows);

sources.forEach((src, i) => {
    const img = t.decodePNG(src);
    const box = t.contentBounds(img);

    const budget = CELL - PAD * 2;
    const scale = Math.min(budget / box.w, budget / box.h);
    const w = Math.max(1, Math.round(box.w * scale));
    const h = Math.max(1, Math.round(box.h * scale));

    const cell = t.resizeRegion(img, box, w, h);

    const col = i % COLUMNS, row = Math.floor(i / COLUMNS);
    const dx = col * CELL + Math.floor((CELL - w) / 2);
    const dy = row * CELL + Math.floor((CELL - h) / 2);
    t.blit(sheet, cell, dx, dy);

    console.log(`index ${i}  ${path.basename(src)}  ${box.w}x${box.h} -> ${w}x${h}  at cell (${col},${row})`);
});

// Fill any unused cells in the last row with index 0, so a bad faceIndex shows Tamu
// rather than an empty box.
if (sources.length % COLUMNS !== 0) {
    const first = t.decodePNG(sources[0]);
    const box = t.contentBounds(first);
    const budget = CELL - PAD * 2;
    const scale = Math.min(budget / box.w, budget / box.h);
    const w = Math.max(1, Math.round(box.w * scale));
    const h = Math.max(1, Math.round(box.h * scale));
    const cell = t.resizeRegion(first, box, w, h);

    for (let i = sources.length; i < rows * COLUMNS; i++) {
        const col = i % COLUMNS, row = Math.floor(i / COLUMNS);
        t.blit(sheet, cell, col * CELL + Math.floor((CELL - w) / 2), row * CELL + Math.floor((CELL - h) / 2));
        console.log(`index ${i}  (padding, copy of index 0)`);
    }
}

t.encodePNG(sheet, outFile);
console.log(`\nwrote ${outFile}  ${sheet.width}x${sheet.height}  (${rows} row(s) of ${COLUMNS})`);
