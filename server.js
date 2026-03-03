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
      system: `You are a horticultural expert. When given a plant name, return ONLY a JSON array of objects with keys "label" and "value".
Include relevant characteristics such as: Высота, Ширина, Место посадки, Зона зимостойкости, Цветение, Аромат (1-3 stars as number), Устойчивость к болезням (1-3 stars as number, for roses), Устойчивость к дождю (1-3 stars as number, for roses), Размер цветка (for roses), Размер соцветия (if applicable), Цвет цветков.
For star parameters, value should be like "2" (just a number 1-3).
For height/width use cm or m. For frost zone use "до -ХХ°С". For bloom use month names in Russian.
Return ONLY valid JSON array, no markdown, no explanation.`,
      messages: [{ role: "user", content: `Plant: ${plantName}` }],
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
