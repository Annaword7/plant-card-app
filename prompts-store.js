// Хранилище промптов: JSON-файл на диске (на Railway — подключённый Volume).
// Заводские значения живут в prompts.defaults.js, файл хранит только то, что отредактировали.

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, accessSync, constants } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { DEFAULT_PROMPTS, PROMPTS_VERSION } from "./prompts.defaults.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function canWrite(dir, { create = true } = {}) {
  try {
    if (!existsSync(dir)) {
      if (!create) return false;
      mkdirSync(dir, { recursive: true });
    }
    accessSync(dir, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

// Приоритет: том Railway → PROMPTS_DIR из env → уже смонтированный /data → ./data рядом с кодом.
// persistent: false означает «правки сохранятся, но пропадут при следующем деплое» —
// папку /data можно создать и без тома, поэтому сама по себе она не считается надёжной.
function resolveDir() {
  const candidates = [
    { dir: process.env.RAILWAY_VOLUME_MOUNT_PATH, persistent: true },
    { dir: process.env.PROMPTS_DIR, persistent: true },
    { dir: "/data", persistent: true, create: false },
    { dir: join(__dirname, "data"), persistent: false },
  ];
  for (const c of candidates) {
    if (c.dir && canWrite(c.dir, { create: c.create !== false })) {
      return { dir: c.dir, persistent: c.persistent };
    }
  }
  return { dir: null, persistent: false };
}

const { dir: DATA_DIR, persistent: PERSISTENT } = resolveDir();
const FILE = DATA_DIR ? join(DATA_DIR, "prompts.json") : null;

console.log(
  FILE
    ? `Prompts storage: ${FILE}${PERSISTENT ? "" : " (внимание: не Volume — правки пропадут при деплое)"}`
    : "Prompts storage: недоступна, работают только заводские промпты"
);

const clone = (v) => JSON.parse(JSON.stringify(v));

function readFile() {
  if (!FILE || !existsSync(FILE)) return null;
  try {
    return JSON.parse(readFileSync(FILE, "utf8"));
  } catch (e) {
    console.error("Не удалось прочитать prompts.json:", e.message);
    return null;
  }
}

function writeFile(data) {
  if (!FILE) throw new Error("Хранилище промптов недоступно");
  const tmp = `${FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  renameSync(tmp, FILE);
}

const str = (v, fallback) => (typeof v === "string" && v.trim() ? v : fallback);

function normalizeType(raw, builtinById) {
  const id = String(raw?.id || "").trim();
  if (!id) return null;
  const builtin = builtinById.get(id);
  const params = Array.isArray(raw.params)
    ? raw.params
        .filter(p => p && String(p.label || "").trim())
        .map(p => ({
          label: String(p.label).trim(),
          hint: String(p.hint ?? "").trim(),
          icon: String(p.icon ?? "").trim() || "•",
          stars: !!p.stars,
        }))
    : builtin?.params ?? [];
  return {
    id,
    label: str(raw.label, builtin?.label ?? id),
    typeBlock: str(raw.typeBlock, builtin?.typeBlock ?? ""),
    params,
    builtin: !!builtin,
  };
}

// Сохранённые данные + заводские значения для всего, чего в файле нет.
// Встроенные типы, добавленные в код позже, подмешиваются к сохранённым.
function merge(saved) {
  const builtinById = new Map(DEFAULT_PROMPTS.types.map(t => [t.id, t]));
  const defaults = clone(DEFAULT_PROMPTS);
  if (!saved) {
    return { ...defaults, types: defaults.types.map(t => ({ ...t, builtin: true })) };
  }
  const savedTypes = Array.isArray(saved.types)
    ? saved.types.map(t => normalizeType(t, builtinById)).filter(Boolean)
    : [];
  const seen = new Set(savedTypes.map(t => t.id));
  const missingBuiltins = defaults.types.filter(t => !seen.has(t.id)).map(t => ({ ...t, builtin: true }));
  return {
    version: PROMPTS_VERSION,
    paramsSystemPrompt: str(saved.paramsSystemPrompt, defaults.paramsSystemPrompt),
    basePrompt: str(saved.basePrompt, defaults.basePrompt),
    disclaimer: str(saved.disclaimer, defaults.disclaimer),
    types: [...savedTypes, ...missingBuiltins],
  };
}

export function getPrompts() {
  return merge(readFile());
}

export function getStorageInfo() {
  return { persistent: PERSISTENT, writable: !!FILE, path: FILE };
}

export function savePrompts(incoming) {
  const merged = merge(incoming);
  if (!merged.types.length) throw new Error("Нужен хотя бы один тип растения");
  writeFile(merged);
  return merged;
}

// Сброс: без typeId — всё целиком, с typeId — только этот тип (если он заводской)
export function resetPrompts(typeId) {
  if (!typeId) {
    const defaults = clone(DEFAULT_PROMPTS);
    const fresh = { ...defaults, types: defaults.types.map(t => ({ ...t, builtin: true })) };
    writeFile(fresh);
    return fresh;
  }
  const current = getPrompts();
  const factory = DEFAULT_PROMPTS.types.find(t => t.id === typeId);
  if (!factory) throw new Error("Этот тип создан вручную — заводской версии у него нет");
  const next = {
    ...current,
    types: current.types.map(t => (t.id === typeId ? { ...clone(factory), builtin: true } : t)),
  };
  writeFile(next);
  return next;
}

export function findType(prompts, typeId) {
  return prompts.types.find(t => t.id === typeId) || prompts.types[0];
}
