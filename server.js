import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { getPrompts, savePrompts, resetPrompts, getStorageInfo, findType } from "./prompts-store.js";
import { buildParamsPrompt, buildDescriptionPrompt, parseDescription } from "./prompt-builder.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "1mb" }));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-5";

// Serve built React app
app.use(express.static(join(__dirname, "dist")));

// ---------- Промпты: чтение, правка, сброс ----------

app.get("/api/prompts", (req, res) => {
  res.json({ ...getPrompts(), storage: getStorageInfo() });
});

app.put("/api/prompts", (req, res) => {
  try {
    const saved = savePrompts(req.body);
    res.json({ ...saved, storage: getStorageInfo() });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

app.post("/api/prompts/reset", (req, res) => {
  try {
    const saved = resetPrompts(req.body?.typeId);
    res.json({ ...saved, storage: getStorageInfo() });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

// ---------- Шаг 1: характеристики для карточки ----------

app.post("/api/plant-params", async (req, res) => {
  const { plantName, typeId } = req.body;
  if (!plantName || !plantName.trim()) {
    return res.status(400).json({ error: "plantName is required" });
  }

  const prompts = getPrompts();
  const type = findType(prompts, typeId);

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1000,
      thinking: { type: "disabled" },
      system: buildParamsPrompt(prompts, type),
      messages: [{ role: "user", content: `Растение: ${plantName}` }],
    });

    const text = message.content?.[0]?.text || "[]";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    res.json(parsed);
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: "Failed to fetch plant data", detail: e.message });
  }
});

// ---------- Шаг 2: SEO-описание ----------

app.post("/api/generate-description", async (req, res) => {
  const { plantName, typeId } = req.body;
  if (!plantName) return res.status(400).json({ error: "plantName is required" });

  const prompts = getPrompts();
  const type = findType(prompts, typeId);
  const prompt = buildDescriptionPrompt(prompts, type, req.body);

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      thinking: { type: "disabled" },
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content?.[0]?.text || "";
    res.json({ sections: parseDescription(text), disclaimer: prompts.disclaimer });
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: "Failed to generate description", detail: e.message });
  }
});

// Fallback: serve index.html for SPA routing
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
