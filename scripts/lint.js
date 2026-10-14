/* Syntax-check every first-party script. No dependency install required. */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const files = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === "legacy" || name.startsWith("oiioCare-public-site")) continue;
    const abs = path.join(dir, name);
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) walk(abs);
    else if (name.endsWith(".js")) files.push(abs);
  }
}
walk(root);
let failed = 0;
for (const file of files) {
  const res = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (res.status !== 0) {
    failed += 1;
    process.stderr.write(file + "\n" + res.stderr);
  }
}
if (failed) {
  console.error(failed + " file(s) failed syntax check");
  process.exit(1);
}
console.log("lint ok (" + files.length + " files)");
