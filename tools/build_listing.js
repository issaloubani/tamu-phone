/*
 * Generates the mods.one description from README.md.
 *
 *   node tools/build_listing.js
 *
 * The readme uses relative image paths, which is right for GitHub and useless anywhere
 * else. This rewrites them to absolute raw URLs and drops the section that only makes sense
 * to someone standing in the repo. Generating it means the listing cannot drift out of sync
 * with the readme, which is exactly what happens when you keep two copies by hand.
 */
const fs = require("fs");
const path = require("path");

const RAW = "https://raw.githubusercontent.com/issaloubani/tamu-phone/main/";

const root = path.join(__dirname, "..");
let md = fs.readFileSync(path.join(root, "README.md"), "utf8");

// Relative image paths -> absolute raw URLs. Leaves anything already absolute alone.
let rewritten = 0;
md = md.replace(/!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g, (_, alt, src) => {
    rewritten++;
    return `![${alt}](${RAW}${src})`;
});

// Everything below the horizontal rule is notes for people reading the source, which is
// noise on a mod listing.
const cut = md.indexOf("\n---\n");
let dropped = 0;
if (cut !== -1) {
    dropped = md.slice(cut).split("\n## ").length - 1;
    md = md.slice(0, cut).trimEnd() + "\n";
}

const out = path.join(root, "branding", "mods-one-description.md");
fs.writeFileSync(out, md);

console.log(`wrote ${path.relative(root, out)}`);
console.log(`  ${rewritten} image path(s) made absolute`);
console.log(`  ${dropped} source-notes section(s) dropped`);
