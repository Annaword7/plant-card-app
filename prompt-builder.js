// Сборка финальных промптов из шаблонов и данных о растении.

export const fill = (template, values) =>
  Object.entries(values).reduce(
    (acc, [key, val]) => acc.replaceAll(`{{${key}}}`, val ?? "—"),
    template
  );

// Шаг 1: системный промпт для подбора характеристик
export function buildParamsPrompt(prompts, type) {
  const paramsSpec = type.params
    .map((p, i) => `${i + 1}. "${p.label}"${p.hint ? ` — ${p.hint}` : ""}`)
    .join("\n");
  return fill(prompts.paramsSystemPrompt, { typeLabel: type.label, paramsSpec });
}

// Оценка звёздами — это 1, 2 или 3. Если у характеристики включён флаг stars,
// а значение текстовое («25–35 см»), оно идёт в промпт как есть: иначе высота
// превращалась бы в «высокую (3/3)».
const WORDS = { 1: "слабая (1/3)", 2: "средняя (2/3)", 3: "высокая (3/3)" };

const starText = (raw) => {
  const text = String(raw ?? "").trim();
  const m = text.match(/^([1-3])\s*(?:\/\s*3)?$/) || text.match(/\(\s*([1-3])\s*\/\s*3\s*\)/);
  return m ? WORDS[m[1]] : text;
};

// Шаг 2: промпт описания. Характеристики типа идут в заданном порядке,
// добавленные вручную на шаге 2 — после них.
export function buildDescriptionPrompt(prompts, type, body) {
  const { plantName, params, group, breeder, experience, extra } = body;
  const byLabel = new Map((params || []).filter(p => p?.label).map(p => [p.label, p.value]));

  const lines = [];
  const missing = [];
  for (const spec of type.params) {
    const val = byLabel.get(spec.label);
    byLabel.delete(spec.label);
    if (val) lines.push(`${spec.label}: ${spec.stars ? starText(val) : val}`);
    else missing.push(spec.label);
  }
  for (const [label, val] of byLabel) if (val) lines.push(`${label}: ${val}`);
  if (missing.length) lines.push(`Нет данных (не упоминай эти характеристики): ${missing.join(", ")}`);

  return fill(prompts.basePrompt, {
    plantName,
    typeLabel: type.label,
    group: group || "—",
    breeder: breeder || "—",
    experience: experience || "данных пока недостаточно",
    extra: extra || "—",
    paramsBlock: lines.join("\n"),
    typeBlock: type.typeBlock || "—",
  });
}

const sectionKeys = {
  "МЕТА-ТЕГИ": "meta",
  "ВВОДНЫЙ АБЗАЦ": "intro",
  "ОСНОВНОЕ ОПИСАНИЕ": "main",
  "ТАБЛИЦА ХАРАКТЕРИСТИК": "table",
  "FAQ": "faq",
};

export function parseDescription(text) {
  const sections = {};
  const matches = [...text.matchAll(/\*\*\[([^\]]+)\]\*\*/g)];
  for (let i = 0; i < matches.length; i++) {
    const key = sectionKeys[matches[i][1].trim()];
    if (!key) continue;
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    sections[key] = text.slice(start, end).trim();
  }
  return sections;
}
