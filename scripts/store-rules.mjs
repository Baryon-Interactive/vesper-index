// Store listing rules for catalogue checks. They match `vesper store check` and
// the aggregation gate (crates/vesper-meta/src/store.rs); the fixtures in
// test/fixtures/store/ are run through both.

export const MAX_FILES = 32;
export const MAX_MARKDOWN_BYTES = 64 * 1024;
export const PLATFORMS = ["windows-x64", "linux-x64", "macos-arm64", "macos-x64", "web-wasm32"];
export const RELEASE_STATUSES = ["coming-soon", "early-access", "released"];
export const FEATURES = [
  "single-player", "online-co-op", "local-co-op", "online-pvp", "local-pvp", "controller",
  "keyboard-mouse", "touch", "cloud-saves", "achievements", "mod-support", "level-editor",
];
export const CONTENT_DESCRIPTORS = [
  "violence", "blood", "gore", "strong-language", "sexual-content", "nudity", "drugs", "alcohol", "gambling", "horror",
];
export const ACCESSIBILITY = [
  "subtitles", "colorblind-modes", "remappable-controls", "adjustable-text-size", "screen-reader",
  "one-handed", "difficulty-options", "reduced-motion", "no-flashing-lights",
];
export const LINKS = [
  "discord", "x", "bluesky", "youtube", "twitch", "reddit", "steam", "itch", "github", "wiki", "press-kit", "support",
];
export const REQUIREMENT_KEYS = ["os", "cpu", "gpu", "memory", "storage", "network", "notes"];
const REQUIRED = [
  "title", "summary", "tags", "screenshots", "cover", "requirements", "paid", "price_display", "developer", "homepage", "platforms",
];
const OPTIONAL = [
  "default_language", "release", "features", "max_players", "languages", "system_requirements", "capsule", "logo",
  "background", "trailers", "links", "publishers", "content_descriptors", "accessibility", "updated", "play_params",
];
export const MAX_PLAY_PARAMS = 16;
export const RESERVED_PLAY_PARAMS = ["app", "channel"];

/** A query key a web game may accept from a play link (play_params). */
export const isPlayParam = (key) =>
  typeof key === "string" && /^[A-Za-z0-9_-]{1,32}$/.test(key) && !RESERVED_PLAY_PARAMS.includes(key);
const MEDIA_RULE = "must have an https url, a 64-character blake3 and width/height from 1 to 16384";

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const chars = (s) => [...s].length;
const text = (v, max) => typeof v === "string" && v.trim().length > 0 && chars(v) <= max;
const https = (v) => typeof v === "string" && v.startsWith("https://") && v.length > 8 && v.length <= 2048 && !/\s/.test(v);
const onlyKeys = (o, allowed) => Object.keys(o).every((k) => allowed.includes(k));
const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

/** A BCP 47 style language tag: en, zh-Hans, pt-BR, es-419. */
export const isLanguageTag = (tag) =>
  typeof tag === "string" && tag.length <= 35 && /^[A-Za-z]{2,3}(-[A-Za-z0-9]{1,8})*$/.test(tag);

/** A catalogue tag: lowercase letters, digits and dashes. */
export const isTag = (tag) => typeof tag === "string" && /^[a-z0-9][a-z0-9-]{0,31}$/.test(tag);

/** Signed store files: store.json, description.md, changelog.md and their per-language variants. */
export function isStoreFileName(name) {
  if (["store.json", "description.md", "changelog.md"].includes(name)) return true;
  const m = /^(description|changelog)\.(.+)\.md$/.exec(name);
  return !!m && isLanguageTag(m[2]);
}

function isDate(v) {
  const m = typeof v === "string" && /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return !!m && +m[1] >= 1970 && +m[1] <= 2999 && +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= 31;
}
const languageMap = (v, max) =>
  isObject(v) && Object.keys(v).length > 0 && Object.entries(v).every(([tag, s]) => isLanguageTag(tag) && text(s, max));
const enumList = (v, allowed, nonEmpty) =>
  Array.isArray(v) && (!nonEmpty || v.length > 0) && v.every((s, i) => allowed.includes(s) && v.indexOf(s) === i);
const media = (v) =>
  isObject(v) &&
  onlyKeys(v, ["url", "blake3", "width", "height"]) &&
  https(v.url) &&
  typeof v.blake3 === "string" &&
  /^[0-9a-fA-F]{64}$/.test(v.blake3) &&
  isInt(v.width, 1, 16384) &&
  isInt(v.height, 1, 16384);

function trailer(t) {
  if (!isObject(t)) return false;
  const titleOk = t.title === undefined || languageMap(t.title, 100);
  if (t.kind === "youtube")
    return onlyKeys(t, ["kind", "id", "title"]) && titleOk && typeof t.id === "string" && /^[A-Za-z0-9_-]{11}$/.test(t.id);
  if (t.kind === "video") {
    const path = typeof t.url === "string" ? t.url.split(/[?#]/)[0].toLowerCase() : "";
    return (
      onlyKeys(t, ["kind", "url", "poster", "title"]) &&
      titleOk &&
      https(t.url) &&
      (path.endsWith(".mp4") || path.endsWith(".webm")) &&
      media(t.poster)
    );
  }
  return false;
}

/** Problems with a store.json value; empty when it is valid. */
export function validateStore(store) {
  const errors = [];
  const fail = (m) => errors.push(m);
  if (!isObject(store)) return ["store.json must be an object"];
  for (const key of REQUIRED) if (!(key in store)) fail(`missing ${key}`);
  for (const key of Object.keys(store)) if (!REQUIRED.includes(key) && !OPTIONAL.includes(key)) fail(`unknown field ${key}`);
  for (const key of ["title", "summary"])
    if (key in store && !languageMap(store[key], 300)) fail(`${key} must map language tags to non-empty text`);
  if ("tags" in store && !(Array.isArray(store.tags) && store.tags.length >= 1 && store.tags.length <= 20 && store.tags.every(isTag)))
    fail("tags must be 1 to 20 lowercase slugs (a-z, 0-9, -)");
  if ("screenshots" in store) {
    if (!Array.isArray(store.screenshots) || store.screenshots.length > 30) fail("screenshots must be a list of at most 30 images");
    else store.screenshots.forEach((s, i) => media(s) || fail(`screenshots[${i}] ${MEDIA_RULE}`));
  }
  for (const key of ["cover", "capsule", "logo", "background"]) if (key in store && !media(store[key])) fail(`${key} ${MEDIA_RULE}`);
  if ("requirements" in store && !(isObject(store.requirements) && Object.values(store.requirements).every((v) => typeof v === "string" && v.length <= 300)))
    fail("requirements must map names to text");
  if ("paid" in store && typeof store.paid !== "boolean") fail("paid must be true or false");
  if ("price_display" in store && typeof store.price_display !== "string") fail("price_display must be text");
  if ("developer" in store && !text(store.developer, 100)) fail("developer must be non-empty text");
  if ("homepage" in store && !https(store.homepage)) fail("homepage must be an https:// URL");
  if ("platforms" in store && !enumList(store.platforms, PLATFORMS, true)) fail(`platforms must list some of ${PLATFORMS.join(", ")}`);
  if ("default_language" in store && !isLanguageTag(store.default_language))
    fail("default_language must be a language tag such as en or zh-Hans");
  if ("release" in store) {
    const r = store.release;
    if (!(isObject(r) && onlyKeys(r, ["status", "date"]) && RELEASE_STATUSES.includes(r.status) && (r.date === undefined || isDate(r.date))))
      fail(`release needs status (${RELEASE_STATUSES.join(", ")}) and an optional date YYYY-MM-DD`);
  }
  if ("updated" in store && !isDate(store.updated)) fail("updated must be a date YYYY-MM-DD");
  for (const [key, allowed] of [["features", FEATURES], ["content_descriptors", CONTENT_DESCRIPTORS], ["accessibility", ACCESSIBILITY]])
    if (key in store && !enumList(store[key], allowed, false)) fail(`${key} must list some of ${allowed.join(", ")}`);
  if ("max_players" in store && !isInt(store.max_players, 1, 1000)) fail("max_players must be a whole number from 1 to 1000");
  if ("languages" in store) {
    const l = store.languages;
    const ok =
      isObject(l) &&
      Object.keys(l).length > 0 &&
      Object.keys(l).length <= 100 &&
      Object.entries(l).every(
        ([tag, s]) =>
          isLanguageTag(tag) &&
          isObject(s) &&
          onlyKeys(s, ["interface", "audio", "subtitles"]) &&
          Object.values(s).every((v) => typeof v === "boolean") &&
          Object.values(s).some((v) => v === true),
      );
    if (!ok) fail("languages must map language tags to {interface, audio, subtitles} with at least one true");
  }
  if ("system_requirements" in store) {
    const sr = store.system_requirements;
    const ok =
      isObject(sr) &&
      Object.entries(sr).every(
        ([platform, tiers]) =>
          PLATFORMS.includes(platform) &&
          isObject(tiers) &&
          Object.keys(tiers).length > 0 &&
          onlyKeys(tiers, ["minimum", "recommended"]) &&
          Object.values(tiers).every(
            (spec) => isObject(spec) && Object.keys(spec).length > 0 && onlyKeys(spec, REQUIREMENT_KEYS) && Object.values(spec).every((v) => text(v, 200)),
          ),
      );
    if (!ok) fail(`system_requirements must map platforms to minimum/recommended with ${REQUIREMENT_KEYS.join(", ")}`);
  }
  if ("trailers" in store) {
    if (!Array.isArray(store.trailers) || store.trailers.length > 10) fail("trailers must be a list of at most 10 videos");
    else
      store.trailers.forEach(
        (t, i) =>
          trailer(t) ||
          fail(`trailers[${i}] must be {kind: youtube, id} or {kind: video, url (.mp4/.webm), poster}, with an optional title map`),
      );
  }
  if ("links" in store && !(isObject(store.links) && Object.entries(store.links).every(([k, v]) => LINKS.includes(k) && https(v))))
    fail(`links must map ${LINKS.join(", ")} to https:// URLs`);
  if ("play_params" in store) {
    const p = store.play_params;
    if (!(Array.isArray(p) && p.length >= 1 && p.length <= MAX_PLAY_PARAMS && p.every((k, i) => isPlayParam(k) && p.indexOf(k) === i)))
      fail(`play_params must list 1 to ${MAX_PLAY_PARAMS} unique query keys (A-Z, a-z, 0-9, _, -; at most 32 characters; not app or channel)`);
  }
  if ("publishers" in store && !(Array.isArray(store.publishers) && store.publishers.length >= 1 && store.publishers.length <= 10 && store.publishers.every((v) => text(v, 100))))
    fail("publishers must list 1 to 10 names");
  return errors;
}
