import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Что знаем о сорте помимо характеристик: группа, селекционер, наш опыт.
export function DescriptionForm({ values, onChange, onGenerate, loading, typeLabel }) {
  const set = (key) => (e) => onChange(v => ({ ...v, [key]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="desc-group">Группа или сорт</FieldLabel>
          <Input
            id="desc-group"
            value={values.group}
            onChange={set("group")}
            placeholder="напр. чайно-гибридная, флорибунда, летний сорт"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="desc-breeder">Селекционер и год</FieldLabel>
          <Input
            id="desc-breeder"
            value={values.breeder}
            onChange={set("breeder")}
            placeholder="напр. David Austin, 1985"
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="desc-exp">Наш опыт выращивания</FieldLabel>
        <FieldDescription>
          Самое ценное для текста: без этого описание выйдет общим, как у всех.
        </FieldDescription>
        <Textarea
          id="desc-exp"
          rows={3}
          value={values.experience}
          onChange={set("experience")}
          placeholder="напр. Зимует без укрытия уже 5 лет, цветёт с июня по октябрь без перерыва, болезней не замечали..."
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="desc-extra">Дополнительные особенности</FieldLabel>
        <Textarea
          id="desc-extra"
          rows={2}
          value={values.extra}
          onChange={set("extra")}
          placeholder="напр. Отлично подходит для вертикального озеленения, подвязки не требует..."
        />
      </Field>

      <Button onClick={onGenerate} disabled={loading} size="lg">
        {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
        {loading ? "Генерирую описание..." : `Сгенерировать описание · ${typeLabel || "растение"}`}
      </Button>
    </div>
  );
}
