import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// От типа зависят и характеристики для картинки, и промпт описания.
export function PlantTypePicker({ types, value, onChange, onOpenEditor }) {
  return (
    <Field>
      <FieldLabel>Тип растения</FieldLabel>
      {types.length ? (
        <ToggleGroup
          type="single"
          value={value}
          onValueChange={v => v && onChange(v)}
          variant="outline"
          className="flex-wrap justify-start"
        >
          {types.map(t => (
            <ToggleGroupItem key={t.id} value={t.id}>{t.label}</ToggleGroupItem>
          ))}
        </ToggleGroup>
      ) : (
        <div className="flex gap-2">
          {[64, 92, 120].map(w => <Skeleton key={w} className="h-8" style={{ width: w }} />)}
        </div>
      )}
      <FieldDescription className="flex flex-wrap items-center gap-1">
        Задаёт и характеристики для карточки, и промпт описания.
        <Button variant="link" size="xs" onClick={onOpenEditor} className="h-auto p-0">
          <Settings2 /> настроить промпты
        </Button>
      </FieldDescription>
    </Field>
  );
}
