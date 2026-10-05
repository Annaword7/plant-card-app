// Разбор того, что вернула модель: чистка markdown-мусора, таблицы характеристик,
// конвертация в HTML для вставки на сайт.

// Убираем ---, ###, разделители markdown-таблиц и повторные пустые строки
export function cleanLines(text) {
  const out = [];
  for (const raw of String(text || "").split("\n")) {
    let line = raw.trim();
    if (/^([-*_]\s*){3,}$/.test(line)) continue;
    if (/^\|?(\s*:?-{2,}:?\s*\|)+\s*$/.test(line)) continue;
    line = line.replace(/^#{1,6}\s*/, "");
    line = line.replace(/^\|\s*/, "").replace(/\s*\|$/, "");
    if (!line && out.length && !out[out.length - 1]) continue;
    out.push(line);
  }
  while (out.length && !out[0]) out.shift();
  while (out.length && !out[out.length - 1]) out.pop();
  return out;
}

export const isTableRow = (line) => line.includes("|") && line.split("|").length === 2;

export const splitRow = (line) => line.split("|").map(c => c.trim());

// Вопросы в FAQ всегда жирные, даже если модель их так не оформила
export const boldQuestions = (text) =>
  String(text || "")
    .split("\n")
    .map(line => {
      const t = line.trim();
      if (!t.endsWith("?") || t.includes("**")) return line;
      const [, num, body] = t.match(/^((?:\d+[.)]\s*)?)(.+)$/);
      return `${num}**${body}**`;
    })
    .join("\n");

// Текст для копирования без разметки: строки таблицы становятся «Параметр: значение»
export const cleanText = (text) =>
  cleanLines(text)
    .map(l => (isTableRow(l) ? splitRow(l).join(": ") : l))
    .join("\n");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

const BOLD_LINE = /^(?:\d+[.)]\s*)?\*\*(.+?)\*\*:?$/;
const LIST_LINE = /^([-*•]|\d+[.)])\s+/;

export function convertToHtml(text) {
  const lines = cleanLines(text);
  const result = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line) { i++; continue; }

    // Таблица характеристик: подряд идущие строки "параметр | значение"
    if (isTableRow(line)) {
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) {
        const [k, v] = splitRow(lines[i]);
        rows.push(`  <tr><td><strong>${inline(k)}</strong></td><td>${inline(v)}</td></tr>`);
        i++;
      }
      result.push(`<table>\n<tbody>\n${rows.join("\n")}\n</tbody>\n</table>`);
      continue;
    }

    // Целиком жирная строка (подзаголовок, вопрос FAQ) — в т.ч. с номером
    const boldOnly = line.match(BOLD_LINE);
    if (boldOnly) {
      result.push(`<p><strong>${esc(boldOnly[1])}</strong></p>`);
      i++;
      continue;
    }

    if (LIST_LINE.test(line)) {
      const items = [];
      while (i < lines.length && LIST_LINE.test(lines[i]) && !BOLD_LINE.test(lines[i])) {
        items.push(`  <li>${inline(lines[i].replace(LIST_LINE, ""))}</li>`);
        i++;
      }
      result.push(`<ul>\n${items.join("\n")}\n</ul>`);
      continue;
    }

    result.push(`<p>${inline(line)}</p>`);
    i++;
  }
  return result.join("\n");
}

// Разбор для превью на экране: абзацы, списки и таблицы как данные,
// рендер — на стороне компонента
export function toBlocks(text) {
  const lines = cleanLines(text);
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    if (!lines[i]) { i++; continue; }

    if (isTableRow(lines[i])) {
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ type: "table", rows });
      continue;
    }

    if (LIST_LINE.test(lines[i]) && !BOLD_LINE.test(lines[i])) {
      const items = [];
      while (i < lines.length && LIST_LINE.test(lines[i]) && !BOLD_LINE.test(lines[i])) {
        items.push(lines[i].replace(LIST_LINE, ""));
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    blocks.push({ type: "p", text: lines[i] });
    i++;
  }
  return blocks;
}

// Куски строки с **жирным** — для рендера в React
export const inlineParts = (s) =>
  s.split(/(\*\*.+?\*\*)/g).map(part =>
    part.startsWith("**") && part.endsWith("**")
      ? { bold: true, text: part.slice(2, -2) }
      : { bold: false, text: part }
  );

// Оценка звёздами — это 1, 2 или 3 (модель иногда пишет «2/3» или «средний (2/3)»).
// Любое другое значение — обычный текст: «25–35 см» и «до -37°С (зона 3)» не должны
// превращаться в звёзды, даже если у характеристики по ошибке включён флаг stars.
export function parseStars(val) {
  const text = String(val ?? "").trim();
  if (!text) return null;
  const m = text.match(/^([1-3])\s*(?:\/\s*3)?$/) || text.match(/\(\s*([1-3])\s*\/\s*3\s*\)/);
  return m ? parseInt(m[1]) : null;
}
