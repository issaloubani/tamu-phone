/*
 * Packs the release zip: only the files the game actually loads.
 *
 *   node tools/build_release.js [outDir]
 *
 * The repo carries art sources, screenshots, banners and this toolchain. None of that is
 * needed to run the mod, and shipping it makes the download several times larger for no
 * reason. The list below is the mod, and nothing else.
 *
 * Everything goes under a tamuphone/ folder inside the zip. OneLoader searches for mod.json
 * recursively so a flat zip would also work, but a single top folder means someone who
 * extracts by hand gets www/mods/tamuphone/ rather than their mods folder sprayed with
 * loose files.
 *
 * Written by hand rather than shelling out to a zip binary, because Windows has no zip on
 * PATH and the rest of this toolchain is dependency-free node.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.join(__dirname, "..");

const FILES = [
    "mod.json",
    "plugins/tamu_phone.js",
    "data/items.jsond",
    "data/commonevents.jsond",
    "img/faces/TAMU.png",
    "README.md"
];

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

/* MS-DOS date and time, which is what a zip entry stores. */
function dosStamp(d) {
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { time, date };
}

const version = JSON.parse(fs.readFileSync(path.join(root, "mod.json"), "utf8")).version;
const outDir = process.argv[2] || root;
const outFile = path.join(outDir, `tamuphone-${version}.zip`);

const stamp = dosStamp(new Date());
const local = [];
const central = [];
let offset = 0;

for (const rel of FILES) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) {
        console.error(`missing: ${rel}`);
        process.exit(1);
    }

    const name = Buffer.from(`tamuphone/${rel}`, "utf8");
    const raw = fs.readFileSync(full);
    const deflated = zlib.deflateRawSync(raw, { level: 9 });
    const crc = crc32(raw);

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);            // version needed
    lh.writeUInt16LE(0, 6);             // flags
    lh.writeUInt16LE(8, 8);             // deflate
    lh.writeUInt16LE(stamp.time, 10);
    lh.writeUInt16LE(stamp.date, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(deflated.length, 18);
    lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(name.length, 26);
    lh.writeUInt16LE(0, 28);
    local.push(lh, name, deflated);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);            // version made by
    cd.writeUInt16LE(20, 6);            // version needed
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(stamp.time, 12);
    cd.writeUInt16LE(stamp.date, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(deflated.length, 20);
    cd.writeUInt32LE(raw.length, 24);
    cd.writeUInt16LE(name.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, name);

    offset += lh.length + name.length + deflated.length;
    console.log(`  ${String(raw.length).padStart(7)} -> ${String(deflated.length).padStart(7)}  tamuphone/${rel}`);
}

const centralBuf = Buffer.concat(central);
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(FILES.length, 8);
eocd.writeUInt16LE(FILES.length, 10);
eocd.writeUInt32LE(centralBuf.length, 12);
eocd.writeUInt32LE(offset, 16);

fs.writeFileSync(outFile, Buffer.concat([...local, centralBuf, eocd]));
console.log(`\nwrote ${outFile}  ${fs.statSync(outFile).size} bytes  (${FILES.length} files)`);
