import { useRef, useState } from "react";
import { Download, Image as ImageIcon, Loader2, RefreshCw, Search, Sprout } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PRESET_LOGOS } from "@/assets/logos";
import { AppHeader } from "@/components/AppHeader";
import { CardStyleSettings } from "@/components/CardStyleSettings";
import { DescriptionForm } from "@/components/DescriptionForm";
import { DescriptionResult } from "@/components/DescriptionResult";
import { ParamPicker } from "@/components/ParamPicker";
import { ImageSearchDialog } from "@/components/ImageSearchDialog";
import { PhotoDropzone } from "@/components/PhotoDropzone";
import { PlantTypePicker } from "@/components/PlantTypePicker";
import { PromptEditor } from "@/components/PromptEditor";
import { StepCard } from "@/components/StepCard";
import { usePrompts } from "@/hooks/use-prompts";
import { useTheme } from "@/hooks/use-theme";
import { drawCard } from "@/lib/card-canvas";

const EMPTY_DESC = { group: "", breeder: "", experience: "", extra: "" };

export default function App() {
  const { theme, toggle } = useTheme();
  const p = usePrompts();

  const [settings, setSettings] = useState({
    logoUrl: PRESET_LOGOS[0].url,
    logoId: PRESET_LOGOS[0].id,
    logoPos: "top-left",
    bgColor: "#74ab2c",
    textColor: "#ffffff",
  });
  const [styleOpen, setStyleOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [imageSearchOpen, setImageSearchOpen] = useState(false);

  const [plantName, setPlantName] = useState("");
  const [photo, setPhoto] = useState(null);
  const [params, setParams] = useState(null);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const canvasRef = useRef();

  const [desc, setDesc] = useState(EMPTY_DESC);
  const [descLoading, setDescLoading] = useState(false);
  const [sections, setSections] = useState(null);

  const fetchParams = async () => {
    if (!plantName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/plant-params", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plantName, typeId: p.typeId }),
      });
      const parsed = await res.json();
      if (!res.ok) throw new Error(parsed.error || "Сервер ответил ошибкой");
      if (!parsed.length) {
        toast.warning("Не нашли такое растение", {
          description: "Проверьте название или добавьте характеристики вручную",
        });
      }
      setParams(parsed);
      setSelected([]);
      setPreviewUrl(null);
      setSections(null);
    } catch (e) {
      toast.error("Не удалось получить характеристики", { description: e.message });
    }
    setLoading(false);
  };

  const generateDescription = async () => {
    setDescLoading(true);
    setSections(null);
    try {
      const res = await fetch("/api/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plantName, params, typeId: p.typeId, ...desc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Сервер ответил ошибкой");
      setSections(data.sections);
    } catch (e) {
      toast.error("Описание не сгенерировалось", { description: e.message });
    }
    setDescLoading(false);
  };

  const renderCard = async () => {
    setRendering(true);
    try {
      const url = await drawCard({
        canvas: canvasRef.current,
        photo,
        params,
        selected,
        settings,
        iconFor: p.iconFor,
        isStarParam: p.isStarParam,
      });
      setPreviewUrl(url);
    } catch (e) {
      toast.error("Карточка не нарисовалась", { description: e.message });
    }
    setRendering(false);
  };

  const startOver = () => {
    setPlantName("");
    setPhoto(null);
    setParams(null);
    setSelected([]);
    setPreviewUrl(null);
    setSections(null);
    setDesc(EMPTY_DESC);
  };

  const toggleParam = (i) =>
    setSelected(prev => (prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]));

  const patchParam = (i, patch) =>
    setParams(list => list.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));

  const addParam = () => {
    setParams(list => [...(list || []), { label: "Параметр", value: "Значение" }]);
    setSelected(prev => [...prev, (params?.length || 0)]);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-background pb-16">
        <AppHeader theme={theme} onToggleTheme={toggle} />

        <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 md:px-8">
          <CardStyleSettings
            settings={settings}
            onChange={setSettings}
            open={styleOpen}
            onOpenChange={setStyleOpen}
          />
          <PromptEditor p={p} open={editorOpen} onOpenChange={setEditorOpen} />

          <StepCard
            step={1}
            title="Фото и название растения"
            description="Название — как на сайте, вместе с сортом."
          >
            <div className="flex flex-wrap gap-6">
              <PhotoDropzone
                photo={photo}
                onPhoto={setPhoto}
                onSearch={() => setImageSearchOpen(true)}
                canSearch={!!plantName.trim()}
              />
              <div className="min-w-56 flex-1 space-y-4">
                <Field>
                  <FieldLabel htmlFor="plant-name">Полное название</FieldLabel>
                  <Input
                    id="plant-name"
                    value={plantName}
                    onChange={e => setPlantName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && fetchParams()}
                    placeholder="Гортензия метельчатая Polar Bear"
                    className="font-heading md:text-base"
                  />
                </Field>

                <PlantTypePicker
                  types={p.types}
                  value={p.typeId}
                  onChange={p.setTypeId}
                  onOpenEditor={() => {
                    p.setDraftTypeId(p.typeId);
                    setEditorOpen(true);
                  }}
                />

                <Button onClick={fetchParams} disabled={loading || !plantName.trim()}>
                  {loading ? <Loader2 className="animate-spin" /> : <Search />}
                  {loading ? "Ищу характеристики..." : "Подобрать характеристики"}
                </Button>
              </div>
            </div>
          </StepCard>

          {params && (
            <StepCard
              step={2}
              title="Карточка для каталога"
              description="Нажмите на параметр, чтобы вывести его на картинку. Карандаш — правка значения."
              action={
                <Button onClick={renderCard} disabled={rendering || !selected.length}>
                  {rendering ? <Loader2 className="animate-spin" /> : <ImageIcon />}
                  Собрать карточку
                </Button>
              }
            >
              <ParamPicker
                params={params}
                selected={selected}
                settings={settings}
                iconFor={p.iconFor}
                isStarParam={p.isStarParam}
                onToggle={toggleParam}
                onPatch={patchParam}
                onAdd={addParam}
              />

              {previewUrl && (
                <div className="mt-6 flex flex-wrap items-start gap-5 border-t pt-5">
                  <img
                    src={previewUrl}
                    alt={`Карточка: ${plantName}`}
                    className="w-72 max-w-full rounded-xl shadow-lg ring-1 ring-foreground/10"
                  />
                  <div className="flex flex-col gap-2">
                    <Button asChild size="lg">
                      <a href={previewUrl} download={`${plantName.replace(/\s+/g, "_") || "card"}.jpg`}>
                        <Download /> Скачать JPG
                      </a>
                    </Button>
                    <Button variant="outline" onClick={renderCard} disabled={rendering}>
                      <RefreshCw /> Перерисовать
                    </Button>
                    <Button variant="ghost" onClick={startOver}>
                      <Sprout /> Новая карточка
                    </Button>
                  </div>
                </div>
              )}
            </StepCard>
          )}

          {params && (
            <StepCard
              step={3}
              title="Описание для сайта"
              description="Текст, таблица характеристик и FAQ — по промпту выбранного типа растения."
            >
              <DescriptionForm
                values={desc}
                onChange={setDesc}
                onGenerate={generateDescription}
                loading={descLoading}
                typeLabel={p.activeType?.label}
              />
              {sections && <DescriptionResult sections={sections} disclaimer={p.disclaimer} />}
            </StepCard>
          )}

          {!params && (
            <Card size="sm">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Карточка и описание появятся, когда подберём характеристики растения.
              </CardContent>
            </Card>
          )}
        </main>

        <ImageSearchDialog
          open={imageSearchOpen}
          onOpenChange={setImageSearchOpen}
          plantName={plantName}
          typeId={p.typeId}
          onPick={setPhoto}
        />

        <canvas ref={canvasRef} className="hidden" />
        <Toaster position="bottom-right" theme={theme} />
      </div>
    </TooltipProvider>
  );
}
