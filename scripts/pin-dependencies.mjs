import { readFileSync, writeFileSync } from "node:fs";
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
for (const section of ["dependencies", "devDependencies"])
  for (const name of Object.keys(pkg[section]))
    pkg[section][name] = lock.packages["node_modules/" + name].version;
pkg.overrides = { uuid: "11.1.1" };
pkg.scripts["setup:local"] = "tsx scripts/setup-local.ts";
pkg.scripts["icons"] = "tsx scripts/icons.ts";
writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
