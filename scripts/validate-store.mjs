#!/usr/bin/env node
// Checks every apps/<id>/ listing in a catalogue: store.json against the store
// rules (scripts/store-rules.mjs) and every store document for size and UTF-8.
import fs from "node:fs";
import path from "node:path";
import { MAX_FILES, MAX_MARKDOWN_BYTES, isStoreFileName, validateStore } from "./store-rules.mjs";

const root = process.argv[2] && !process.argv[2].startsWith("-") ? process.argv[2] : process.cwd();
const fail = (message) => {
  console.error(`validate-store: ${message}`);
  process.exitCode = 1;
};
const utf8 = new TextDecoder("utf-8", { fatal: true });
let checked = 0;
const appsDir = path.join(root, "apps");
if (!fs.existsSync(appsDir)) fail(`missing ${appsDir}`);
else
  for (const app of fs
    .readdirSync(appsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()) {
    const dir = path.join(appsDir, app);
    const storePath = path.join(dir, "store.json");
    if (!fs.existsSync(storePath)) {
      fail(`${app}: missing store.json`);
      continue;
    }
    let store;
    try {
      store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    } catch (e) {
      fail(`${app}: invalid JSON (${e.message})`);
      continue;
    }
    checked++;
    for (const problem of validateStore(store)) fail(`${app}: ${problem}`);
    if (!fs.existsSync(path.join(dir, "description.md"))) fail(`${app}: missing description.md`);
    const files = fs.readdirSync(dir).filter(isStoreFileName);
    if (files.length > MAX_FILES) fail(`${app}: more than ${MAX_FILES} store files`);
    for (const name of files.filter((n) => n.endsWith(".md"))) {
      const bytes = fs.readFileSync(path.join(dir, name));
      if (bytes.length > MAX_MARKDOWN_BYTES) fail(`${app}: ${name} exceeds ${MAX_MARKDOWN_BYTES} bytes`);
      try {
        utf8.decode(bytes);
      } catch {
        fail(`${app}: ${name} is not UTF-8`);
      }
    }
  }
if (!process.exitCode) console.log(`validated ${checked} store.json file(s)`);
