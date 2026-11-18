import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { isLanguageTag, isStoreFileName, validateStore } from "../scripts/store-rules.mjs";

const dir = path.resolve(import.meta.dirname, "..");
const fixtures = path.join(dir, "test/fixtures/store");
const scratch = path.join(dir, "test/.tmp");
fs.mkdirSync(scratch, { recursive: true });
const load = (name) => JSON.parse(fs.readFileSync(path.join(fixtures, name), "utf8"));

// The same fixtures run through crates/vesper-meta/src/store.rs, so both gates agree.
for (const name of fs.readdirSync(fixtures).filter((n) => n.endsWith(".json")).sort())
  test(`shared fixture ${name}`, () => {
    const problems = validateStore(load(name));
    if (name.startsWith("valid-")) assert.deepEqual(problems, []);
    else assert.notDeepEqual(problems, [], `${name} should be rejected`);
  });

test("rules name the field that is wrong", () => {
  const store = load("valid-full.json");
  store.max_players = 0;
  store.features = ["single-player", "single-player"];
  store.trailers = [{ kind: "youtube", id: "short" }];
  store.links = { myspace: "https://example.com" };
  const problems = validateStore(store).join("\n");
  for (const field of ["max_players", "features", "trailers[0]", "links"]) assert.ok(problems.includes(field), field);
});

test("store file names and language tags", () => {
  for (const name of ["store.json", "description.md", "changelog.md", "description.zh-Hans.md", "changelog.pt-BR.md"])
    assert.ok(isStoreFileName(name), name);
  for (const name of ["readme.md", "changelog.x.md", "description..md", "store.en.json", "../description.md"])
    assert.ok(!isStoreFileName(name), name);
  for (const tag of ["en", "zh-Hans", "es-419", "pt-BR"]) assert.ok(isLanguageTag(tag), tag);
  for (const tag of ["e", "english", "zh_Hans", "en-", "1a"]) assert.ok(!isLanguageTag(tag), tag);
});

test("catalogue check rejects documents that are too large or not UTF-8", () => {
  const temp = fs.mkdtempSync(path.join(scratch, "docs-"));
  try {
    fs.cpSync(path.join(dir, "test/fixtures/index"), temp, { recursive: true });
    const app = path.join(temp, "apps/example-game");
    const run = () => spawnSync(process.execPath, [path.join(dir, "scripts/validate-store.mjs"), temp], { encoding: "utf8" });
    fs.writeFileSync(path.join(app, "changelog.md"), "## 1.1\n\nFaster loading.\n");
    assert.equal(run().status, 0, run().stderr);
    fs.writeFileSync(path.join(app, "changelog.md"), Buffer.from([0xff, 0xfe, 0x00]));
    assert.match(run().stderr, /changelog\.md is not UTF-8/);
    fs.writeFileSync(path.join(app, "changelog.md"), "x".repeat(64 * 1024 + 1));
    assert.match(run().stderr, /changelog\.md exceeds/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
