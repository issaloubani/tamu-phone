/*
 * Builds a banner for the mod listing, at whatever size the site asks for.
 *
 *   node tools/build_banner.js <out.png> <width> <height> [--small]
 *
 * Same palette as everything else: TAMU green on the near-black the face box uses in game,
 * so the banner, the icon and the actual dialogue all look like one thing.
 *
 *   node tools/build_banner.js banner.png 1920 720
 *   node tools/build_banner.js banner-small.png 960 540 --small
 */
const path = require("path");
const t = require(path.join(__dirname, "pngtool.js"));
const font = require(path.join(__dirname, "pixelfont.js"));

const INK = [0x5c, 0x8f, 0x6b];
const DIM = [0x33, 0x55, 0x40];   // quieter green for the subtitle
const BG = [0x0b, 0x0d, 0x0c];

const TITLE = "TAMU PHONE";
const SUBTITLE = "A BLUNT CAT WHO BENDS THE RULES";

const [outFile, wArg, hArg, ...flags] = process.argv.slice(2);
if (!outFile || !wArg || !hArg) {
    console.error("usage: node build_banner.js <out.png> <width> <height> [--small]");
    process.exit(1);
}

const W = parseInt(wArg, 10);
const H = parseInt(hArg, 10);
const small = flags.includes("--small");

const banner = t.blank(W, H);
for (let i = 0; i < W * H; i++) {
    const d = i * 4;
    banner.data[d] = BG[0];
    banner.data[d + 1] = BG[1];
    banner.data[d + 2] = BG[2];
    banner.data[d + 3] = 255;
}

const pad = Math.round(H * 0.10);

/* --- the face, left --------------------------------------------------------- */

// Index 0 is neutral, index 2 is smug. The big banner gets smug because it has room for
// the subtitle to justify the attitude; the small one stays neutral so it reads at a
// glance in a list.
const faceSrc = small ? "00_neutral.png" : "02_smug.png";
const src = t.decodePNG(path.join(__dirname, "..", "art", faceSrc));
const box = t.contentBounds(src);

// TAMU's head is about 1.5:1, so scaling it by height alone eats the whole banner on any
// squarer aspect and squeezes the title down to nothing. Bound it by width too, and centre
// it vertically instead of pinning it to the top padding.
const MAX_FACE_WIDTH = 0.32;
const faceScale = Math.min((H - pad * 2) / box.h, (W * MAX_FACE_WIDTH) / box.w);
const faceW = Math.round(box.w * faceScale);
const faceH = Math.round(box.h * faceScale);
const face = t.resizeRegion(src, box, faceW, faceH);

/* --- size the text ---------------------------------------------------------- */

const gapX = pad;
const availW = W - (pad * 2) - faceW - gapX;

const titleScale = font.fitScale(TITLE, availW, Math.round(H * (small ? 0.34 : 0.26)));
const titleW = font.textWidth(TITLE) * titleScale;
const titleH = font.GLYPH_H * titleScale;

const subScale = small ? 0 : Math.max(1, font.fitScale(SUBTITLE, availW, Math.round(H * 0.10)));
const subW = small ? 0 : font.textWidth(SUBTITLE) * subScale;
const subH = small ? 0 : font.GLYPH_H * subScale;

/* --- lay the whole group out as one block, centred --------------------------- */

// Pinning the face to the left padding and letting the text stop wherever it stops leaves
// a ragged gap on the right. Measure face plus text together and centre that instead.
const contentW = faceW + gapX + Math.max(titleW, subW);
const startX = Math.round((W - contentW) / 2);
const textX = startX + faceW + gapX;

t.blit(banner, face, startX, Math.round((H - faceH) / 2));

if (small) {
    font.drawText(banner, TITLE, textX, Math.round((H - titleH) / 2), titleScale, INK);
} else {
    const gapY = Math.round(H * 0.08);
    const top = Math.round((H - (titleH + gapY + subH)) / 2);
    font.drawText(banner, TITLE, textX, top, titleScale, INK);
    font.drawText(banner, SUBTITLE, textX, top + titleH + gapY, subScale, DIM);
}

/* --- a hairline frame, so it does not bleed into a dark page ----------------- */

const edge = Math.max(1, Math.round(H / 240));
for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
        const onEdge = x < edge || y < edge || x >= W - edge || y >= H - edge;
        if (!onEdge) continue;
        const d = (y * W + x) * 4;
        banner.data[d] = DIM[0];
        banner.data[d + 1] = DIM[1];
        banner.data[d + 2] = DIM[2];
    }
}

t.encodePNG(banner, outFile);
console.log(
    `${outFile}  ${W}x${H}  face ${faceSrc} at ${faceW}x${faceH}, ` +
    `title scale ${titleScale} (${titleW}px of ${availW} available)`
);
