import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Serve built React app
app.use(express.static(join(__dirname, "dist")));

// Proxy endpoint for plant parameters
app.post("/api/plant-params", async (req, res) => {
  const { plantName } = req.body;
  if (!plantName || !plantName.trim()) {
    return res.status(400).json({ error: "plantName is required" });
  }

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      temperature: 0,
      system: `Ты эксперт-садовод с энциклопедическими знаниями о растениях. По названию растения возвращай ТОЛЬКО JSON-массив объектов с ключами "label" и "value".

Правила:
- Если растение неизвестно или название некорректно — верни пустой массив [].
- Включай только те характеристики, которые достоверно известны для данного растения.
- Порядок характеристик всегда одинаковый (пропускай неприменимые).

Характеристики в порядке вывода:
1. "Высота" — в см или м (например: "60–90 см", "1.5–2 м")
2. "Ширина" — в см или м
3. "Цвет цветков" — точное описание цвета
4. "Цветение" — месяцы на русском (например: "июнь–август")
5. "Место посадки" — солнце/полутень/тень
6. "Зона зимостойкости" — в формате "до -29°С (зона 5)"
7. "Аромат" — только число 1, 2 или 3 (1 = слабый, 2 = средний, 3 = сильный). Если аромата нет — не включай.
8. "Размер цветка" — только для роз и крупноцветковых, в см
9. "Размер соцветия" — только если применимо, в см
10. "Устойчивость к болезням" — только для роз: число 1, 2 или 3
11. "Устойчивость к дождю" — только для роз: число 1, 2 или 3

Верни ТОЛЬКО валидный JSON-массив без markdown, без пояснений.`,
      messages: [{ role: "user", content: `Растение: ${plantName}` }],
    });

    const text = message.content?.[0]?.text || "[]";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    res.json(parsed);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch plant data" });
  }
});

// Fallback: serve index.html for SPA routing
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
