/*
 * A 5x7 uppercase bitmap font, drawn by hand.
 *
 * There is no font rendering available offline in plain node, and hauling in a font library
 * to draw ten letters would be silly. A hand-built pixel font also happens to be the right
 * look here, since everything else in this mod is pixel art on a grid.
 */

const GLYPHS = {
    A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
    D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
    H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
    K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
    R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
    W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
    X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
    Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
    "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
    "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    "9": ["01110", "10001", "10001", "01111", "00001", "10001", "01110"],
    " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
    ".": ["00000", "00000", "00000", "00000", "00000", "00000", "00100"],
    ",": ["00000", "00000", "00000", "00000", "00000", "00100", "01000"],
    "'": ["00100", "00100", "00000", "00000", "00000", "00000", "00000"],
    "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
    "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
    "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"]
};

const GLYPH_W = 5;
const GLYPH_H = 7;
const TRACKING = 1; // blank columns between glyphs, in font pixels

/* Width of a string in font pixels at scale 1. */
function textWidth(text) {
    if (!text.length) return 0;
    return text.length * (GLYPH_W + TRACKING) - TRACKING;
}

/* Largest integer scale at which `text` fits inside maxWidth (and maxHeight, if given). */
function fitScale(text, maxWidth, maxHeight) {
    let s = Math.floor(maxWidth / textWidth(text));
    if (maxHeight) s = Math.min(s, Math.floor(maxHeight / GLYPH_H));
    return Math.max(1, s);
}

/* Draw text into an RGBA image buffer. Colour is [r, g, b]. */
function drawText(img, text, x, y, scale, colour) {
    let cursor = x;
    for (const raw of text.toUpperCase()) {
        const glyph = GLYPHS[raw] || GLYPHS[" "];
        for (let gy = 0; gy < GLYPH_H; gy++) {
            for (let gx = 0; gx < GLYPH_W; gx++) {
                if (glyph[gy][gx] !== "1") continue;
                for (let sy = 0; sy < scale; sy++) {
                    for (let sx = 0; sx < scale; sx++) {
                        const px = cursor + gx * scale + sx;
                        const py = y + gy * scale + sy;
                        if (px < 0 || py < 0 || px >= img.width || py >= img.height) continue;
                        const d = (py * img.width + px) * 4;
                        img.data[d] = colour[0];
                        img.data[d + 1] = colour[1];
                        img.data[d + 2] = colour[2];
                        img.data[d + 3] = 255;
                    }
                }
            }
        }
        cursor += (GLYPH_W + TRACKING) * scale;
    }
}

module.exports = { GLYPH_W, GLYPH_H, TRACKING, textWidth, fitScale, drawText };
