import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

// Запасные значения — на случай, если промпты с сервера ещё не пришли
const FALLBACK_ICONS = {
  "Высота": "↑",
  "Ширина": "↔",
  "Место посадки": "☀",
  "Зона зимостойкости": "❄",
  "Цветение": "✿",
  "Устойчивость к болезням": "🛡",
  "Устойчивость к дождю": "🌧",
  "Размер цветка": "✾",
  "Размер соцветия": "❋",
  "Аромат": "◈",
  "Цвет цветков": "◉",
};

const FALLBACK_STARS = ["Устойчивость к болезням", "Устойчивость к дождю", "Аромат"];

export const FALLBACK_DISCLAIMER =
  "Внимание: информация, содержащаяся в описании товара, является справочной (не является публичной офертой и не попадает под п. 2 ст. 437 ГК РФ).";

export const ICON_CHOICES = ["↑","↔","↗","◉","✿","☀","❄","◈","✾","❋","🛡","🌧","📅","⏳","⌛","✦","●","🧺","⚥","⚭","⊙","⌂","⛰","💧","✂","⬢","🍂","✸","•"];

const clone = (v) => JSON.parse(JSON.stringify(v));

// Промпты по типам растений: загрузка с сервера, черновик для редактора,
// сохранение и сброс. Всё, что знает про типы, живёт здесь.
export function usePrompts() {
  const [prompts, setPrompts] = useState(null);
  const [draft, setDraft] = useState(null);
  const [typeId, setTypeId] = useState("rose");
  const [draftTypeId, setDraftTypeId] = useState("rose");
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const apply = useCallback((data) => {
    setPrompts(data);
    setDraft(clone(data));
    const pick = (prev) => (data.types.some(t => t.id === prev) ? prev : data.types[0]?.id || "rose");
    setTypeId(pick);
    setDraftTypeId(pick);
  }, []);

  useEffect(() => {
    fetch("/api/prompts")
      .then(r => r.json())
      .then(data => {
        if (!data?.types?.length) throw new Error("bad payload");
        apply(data);
      })
      .catch(() => setLoadFailed(true));
  }, [apply]);

  const types = prompts?.types || [];
  const activeType = types.find(t => t.id === typeId) || types[0] || null;
  const draftType = draft?.types.find(t => t.id === draftTypeId) || draft?.types[0] || null;

  // Ищем характеристику в выбранном типе, затем в остальных — чтобы параметры,
  // полученные до переключения типа, не теряли иконку и звёзды
  const specFor = useCallback(
    (label) =>
      activeType?.params.find(p => p.label === label) ||
      types.flatMap(t => t.params).find(p => p.label === label),
    [activeType, types]
  );

  const iconFor = useCallback(
    (label) => specFor(label)?.icon || FALLBACK_ICONS[label] || "•",
    [specFor]
  );

  const isStarParam = useCallback(
    (label) => {
      const spec = specFor(label);
      return spec ? !!spec.stars : FALLBACK_STARS.includes(label);
    },
    [specFor]
  );

  const dirty = useMemo(
    () => !!draft && !!prompts && JSON.stringify(draft) !== JSON.stringify(prompts),
    [draft, prompts]
  );

  // --- правки черновика ---

  const patchDraft = (patch) => setDraft(d => ({ ...d, ...patch }));

  const patchType = (patch) =>
    setDraft(d => ({ ...d, types: d.types.map(t => (t.id === draftTypeId ? { ...t, ...patch } : t)) }));

  const patchParam = (idx, patch) =>
    patchType({ params: draftType.params.map((p, i) => (i === idx ? { ...p, ...patch } : p)) });

  const addParam = () =>
    patchType({ params: [...draftType.params, { label: "", hint: "", icon: "•", stars: false }] });

  const removeParam = (idx) => patchType({ params: draftType.params.filter((_, i) => i !== idx) });

  const moveParam = (idx, dir) => {
    const next = [...draftType.params];
    const to = idx + dir;
    if (to < 0 || to >= next.length) return;
    [next[idx], next[to]] = [next[to], next[idx]];
    patchType({ params: next });
  };

  // Новый тип клонирует характеристики текущего — так быстрее заполнять
  const addType = (label) => {
    const name = label.trim();
    if (!name) return;
    const id = `custom-${Date.now()}`;
    setDraft(d => ({
      ...d,
      types: [
        ...d.types,
        { id, label: name, typeBlock: "", params: draftType ? clone(draftType.params) : [], builtin: false },
      ],
    }));
    setDraftTypeId(id);
    toast.success(`Тип «${name}» создан`, { description: "Отредактируйте и нажмите «Сохранить»" });
  };

  const removeType = () => {
    if (!draftType || draftType.builtin) return;
    const rest = draft.types.filter(t => t.id !== draftType.id);
    setDraft(d => ({ ...d, types: rest }));
    setDraftTypeId(rest[0]?.id);
  };

  const revert = () => {
    setDraft(clone(prompts));
    toast("Правки отменены");
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка сохранения");
      apply(data);
      toast.success("Промпты сохранены");
    } catch (e) {
      toast.error("Не сохранилось", { description: e.message });
    }
    setSaving(false);
  };

  const reset = async (scope) => {
    setSaving(true);
    try {
      const res = await fetch("/api/prompts/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scope === "all" ? {} : { typeId: draftTypeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка сброса");
      apply(data);
      toast.success(scope === "all" ? "Все промпты сброшены" : "Тип сброшен к заводскому");
    } catch (e) {
      toast.error("Не получилось", { description: e.message });
    }
    setSaving(false);
  };

  return {
    prompts, draft, types, typeId, setTypeId, draftTypeId, setDraftTypeId,
    activeType, draftType, loadFailed, saving, dirty,
    disclaimer: prompts?.disclaimer || FALLBACK_DISCLAIMER,
    storage: prompts?.storage,
    iconFor, isStarParam,
    patchDraft, patchType, patchParam, addParam, removeParam, moveParam,
    addType, removeType, revert, save, reset,
  };
}
