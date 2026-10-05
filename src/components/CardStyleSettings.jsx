import { useRef } from "react";
import { ChevronDown, FolderOpen, Palette } from "lucide-react";
import { PRESET_LOGOS } from "@/assets/logos";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "cn";

const POSITIONS = [
  { value: "top-left", label: "Верхний левый" },
  { value: "top-right", label: "Верхний правый" },
  { value: "bottom-left", label: "Нижний левый" },
  { value: "bottom-right", label: "Нижний правый" },
];

function ColorField({ label, value, onChange }) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          aria-label={label}
          className="size-9 cursor-pointer rounded-md border bg-background p-1"
        />
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-28 font-mono text-xs"
        />
      </div>
    </Field>
  );
}

// Оформление карточки: логотип, его угол и цвета «таблеток» с параметрами.
export function CardStyleSettings({ settings, onChange, open, onOpenChange }) {
  const fileRef = useRef();
  const set = (patch) => onChange(s => ({ ...s, ...patch }));

  const upload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set({ logoUrl: ev.target.result, logoId: "custom" });
    reader.readAsDataURL(file);
  };

  const isCustom = !PRESET_LOGOS.some(l => l.id === settings.logoId);

  return (
    <Card size="sm" className="gap-0 py-0">
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CollapsibleTrigger className="group flex w-full items-center gap-2 px-4 py-3 text-left text-sm">
          <Palette className="size-4 text-muted-foreground" />
          <span className="font-medium">Оформление карточки</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            логотип, углы, цвета
          </span>
          <span className="ml-auto flex items-center gap-2">
            <span
              className="size-4 rounded-full border"
              style={{ background: settings.bgColor }}
              aria-hidden
            />
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </span>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="grid gap-5 border-t py-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field className="sm:col-span-2">
              <FieldLabel>Логотип</FieldLabel>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_LOGOS.map(logo => (
                  <button
                    key={logo.id}
                    type="button"
                    onClick={() => set({ logoUrl: logo.url, logoId: logo.id })}
                    aria-pressed={settings.logoId === logo.id}
                    className={cn(
                      "flex size-16 items-center justify-center overflow-hidden rounded-lg border-2 bg-muted/40 p-1 transition-colors",
                      settings.logoId === logo.id ? "border-primary" : "border-transparent hover:border-border"
                    )}
                  >
                    <img src={logo.url} alt={logo.label} className="max-h-full max-w-full object-contain" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => fileRef.current.click()}
                  className={cn(
                    "flex size-16 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground",
                    isCustom && settings.logoUrl ? "border-primary text-primary" : "border-border"
                  )}
                >
                  <FolderOpen className="size-4" />
                  Свой
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={upload} className="hidden" />
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="logo-pos">Позиция логотипа</FieldLabel>
              <Select value={settings.logoPos} onValueChange={v => set({ logoPos: v })}>
                <SelectTrigger id="logo-pos" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="flex flex-col gap-4">
              <ColorField
                label="Заливка параметров"
                value={settings.bgColor}
                onChange={v => set({ bgColor: v })}
              />
              <ColorField
                label="Цвет текста"
                value={settings.textColor}
                onChange={v => set({ textColor: v })}
              />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
