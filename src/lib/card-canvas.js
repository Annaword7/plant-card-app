// Отрисовка карточки 800×800 на canvas: фото, затемнение к низу, «таблетки»
// параметров снизу и логотип в выбранном углу.

import { parseStars } from "./markdown.js";

const SIZE = 800;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Возвращает data-URL готовой картинки. iconFor / isStarParam приходят снаружи:
// иконки и «звёздные» параметры заданы в спецификации типа растения.
export async function drawCard({ canvas, photo, params, selected, settings, iconFor, isStarParam }) {
  // Inject Google Fonts link if not already present
  if (!document.querySelector("#open-sans-link")) {
    const link = document.createElement("link");
    link.id = "open-sans-link";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&display=block";
    document.head.appendChild(link);
    // Give the stylesheet a moment to parse and trigger font downloads
    await new Promise(r => setTimeout(r, 100));
  }

  // Wait for Open Sans specifically, with a 4s timeout fallback
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load("700 20px 'Open Sans'"),
        document.fonts.load("400 20px 'Open Sans'"),
      ]),
      new Promise(r => setTimeout(r, 4000)),
    ]);
  } catch (e) { /* fall back to system font */ }

  if (!canvas) return null;
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");

  // Draw photo background
  if (photo) {
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.max(SIZE / img.width, SIZE / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
        resolve();
      };
      img.src = photo;
    });
  } else {
    ctx.fillStyle = "#4a7c3f";
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  // Gradient overlay at bottom
  const grad = ctx.createLinearGradient(0, SIZE * 0.35, 0, SIZE);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.4, "rgba(0,0,0,0.25)");
  grad.addColorStop(1, "rgba(0,0,0,0.6)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const active = selected
    .filter(i => params[i])
    .sort((a, b) => a - b)
    .map(i => params[i]);

  const bgColor = settings.bgColor;
  const textColor = settings.textColor;

  const FONT_SIZE = 26;
  const LINE_H = FONT_SIZE * 1.35;
  const PILL_PAD_X = 18;
  const PILL_PAD_Y = 10;
  const GAP_X = 10;
  const GAP_Y = 10;
  const PILL_RADIUS = 22;
  const MARGIN = 20;
  const MAX_W = SIZE - MARGIN * 2;

  function wrapText(ctx, text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  // Measure each pill's width and height
  const pills = active.map(p => {
    const starParam = isStarParam(p.label);
    const starCount = starParam ? parseStars(p.value) : null;
    const icon = iconFor(p.label);
    const labelText = `${icon} ${p.label}:`;
    const valText = !starParam ? p.value : null;

    // Try single-line first (label + value side by side)
    ctx.font = `bold ${FONT_SIZE}px 'Open Sans'`;
    const labelW = ctx.measureText(labelText).width;
    ctx.font = `${FONT_SIZE}px 'Open Sans'`;
    const valW = valText ? ctx.measureText("  " + valText).width
                         : starParam ? (FONT_SIZE + 4) * 3 : 0;

    const singleLineW = PILL_PAD_X * 2 + labelW + valW + 8;

    let pillW, pillH, multiLine = false;

    if (singleLineW <= MAX_W) {
      // Fits on one line
      pillW = singleLineW;
      pillH = PILL_PAD_Y * 2 + LINE_H;
    } else {
      // Wrap: label on its own lines, value on its own lines
      multiLine = true;
      pillW = Math.min(singleLineW, MAX_W);
      const innerW = pillW - PILL_PAD_X * 2;
      ctx.font = `bold ${FONT_SIZE}px 'Open Sans'`;
      const lLines = wrapText(ctx, labelText, innerW);
      ctx.font = `${FONT_SIZE}px 'Open Sans'`;
      const vLines = valText ? wrapText(ctx, valText, innerW) : [];
      const totalLines = lLines.length + (valText ? vLines.length : (starParam ? 1 : 0));
      pillH = PILL_PAD_Y * 2 + totalLines * LINE_H;
    }

    return { p, starParam, starCount, icon, labelText, valText, labelW, valW, pillW, pillH, multiLine };
  });

  // Staggered layout: pack pills row by row from bottom
  // First, lay them out top-down, then offset everything to bottom
  const rows = [];
  let rowX = MARGIN;
  let currentRow = [];
  let currentRowH = 0;

  for (const pill of pills) {
    if (rowX + pill.pillW > SIZE - MARGIN && currentRow.length > 0) {
      rows.push({ items: currentRow, rowH: currentRowH });
      currentRow = [];
      rowX = MARGIN;
      currentRowH = 0;
    }
    currentRow.push({ ...pill, x: rowX });
    rowX += pill.pillW + GAP_X;
    currentRowH = Math.max(currentRowH, pill.pillH);
  }
  if (currentRow.length > 0) rows.push({ items: currentRow, rowH: currentRowH });

  // Total height, anchor to bottom
  const totalH = rows.reduce((s, r) => s + r.rowH + GAP_Y, 0);
  let curY = SIZE - MARGIN - totalH;

  for (const row of rows) {
    for (const pill of row.items) {
      const { x, pillW, pillH, labelText, valText, starParam, starCount, labelW, valW, multiLine } = pill;
      const innerW = pillW - PILL_PAD_X * 2;

      // Background
      ctx.fillStyle = bgColor;
      ctx.globalAlpha = 0.92;
      roundRect(ctx, x, curY, pillW, pillH, PILL_RADIUS);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      if (!multiLine) {
        // Single line: vertically centered in pill
        const textY = curY + pillH / 2;
        ctx.font = `bold ${FONT_SIZE}px 'Open Sans'`;
        ctx.fillStyle = textColor;
        ctx.fillText(labelText, x + PILL_PAD_X, textY);

        if (starParam && starCount !== null) {
          ctx.font = `${FONT_SIZE + 2}px 'Open Sans'`;
          for (let s = 0; s < 3; s++) {
            ctx.fillStyle = s < starCount ? "#FFD700" : "rgba(255,255,255,0.3)";
            ctx.fillText("★", x + PILL_PAD_X + labelW + 8 + s * (FONT_SIZE + 4), textY);
          }
        } else if (valText) {
          ctx.font = `${FONT_SIZE}px 'Open Sans'`;
          ctx.fillStyle = textColor;
          ctx.fillText("  " + valText, x + PILL_PAD_X + labelW, textY);
        }
      } else {
        // Multi-line: start first line centered in its row slot
        let ty = curY + PILL_PAD_Y + LINE_H / 2;
        ctx.font = `bold ${FONT_SIZE}px 'Open Sans'`;
        ctx.fillStyle = textColor;
        const lLines = wrapText(ctx, labelText, innerW);
        for (const line of lLines) { ctx.fillText(line, x + PILL_PAD_X, ty); ty += LINE_H; }

        if (starParam && starCount !== null) {
          ctx.font = `${FONT_SIZE + 2}px 'Open Sans'`;
          for (let s = 0; s < 3; s++) {
            ctx.fillStyle = s < starCount ? "#FFD700" : "rgba(255,255,255,0.3)";
            ctx.fillText("★", x + PILL_PAD_X + s * (FONT_SIZE + 4), ty);
          }
        } else if (valText) {
          ctx.font = `${FONT_SIZE}px 'Open Sans'`;
          ctx.fillStyle = textColor;
          const vLines = wrapText(ctx, valText, innerW);
          for (const line of vLines) { ctx.fillText(line, x + PILL_PAD_X, ty); ty += LINE_H; }
        }
      }
    }
    curY += row.rowH + GAP_Y;
  }

  // Logo — preserve aspect ratio, fit within MAX_LOGO box
  if (settings.logoUrl) {
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const MAX_LOGO = 220;
        const margin = 20;
        const ratio = img.width / img.height;
        let lw, lh;
        if (ratio >= 1) { lw = MAX_LOGO; lh = MAX_LOGO / ratio; }
        else { lh = MAX_LOGO; lw = MAX_LOGO * ratio; }
        let lx, ly;
        if (settings.logoPos === "top-left")    { lx = margin; ly = margin; }
        else if (settings.logoPos === "top-right")   { lx = SIZE - lw - margin; ly = margin; }
        else if (settings.logoPos === "bottom-left") { lx = margin; ly = SIZE - lh - margin; }
        else                                          { lx = SIZE - lw - margin; ly = SIZE - lh - margin; }
        ctx.drawImage(img, lx, ly, lw, lh);
        resolve();
      };
      img.onerror = resolve;
      img.src = settings.logoUrl;
    });
  }

  return canvas.toDataURL("image/jpeg", 0.95);
}
