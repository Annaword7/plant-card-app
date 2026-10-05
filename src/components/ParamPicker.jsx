import { Pencil, Plus } from "lucide-react";
import { parseStars } from "@/lib/markdown";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "cn";

function Stars({ count }) {
  return (
    <span aria-label={`${count} из 3`}>
      {[0, 1, 2].map(i => (
        <span key={i} className={i < count ? "" : "opacity-30"}>★</span>
      ))}
    </span>
  );
}

// «Таблетка» параметра: клик включает её в карточку, карандаш открывает правку.
function ParamChip({ param, active, settings, icon, stars, onToggle, onPatch }) {
  // Звёзды рисуем, только если значение и правда оценка 1–3
  const count = stars ? parseStars(param.value) : null;

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border py-1 pr-1 pl-3 text-sm transition-colors",
        active ? "border-transparent" : "bg-card hover:bg-muted"
      )}
      style={active ? { background: settings.bgColor, color: settings.textColor } : undefined}
    >
      <button
        type="button"
        onClick={onToggle}
        className="min-w-0 cursor-pointer truncate text-left"
        aria-pressed={active}
      >
        <span className="font-medium">{icon} {param.label}:</span>{" "}
        {count !== null ? <Stars count={count} /> : param.value}
      </button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Изменить «${param.label}»`}
            className={cn("rounded-full", active && "hover:bg-black/10 dark:hover:bg-white/15")}
            style={active ? { color: settings.textColor } : undefined}
          >
            <Pencil />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-3">
          <Field>
            <FieldLabel>Название</FieldLabel>
            <Input value={param.label} onChange={e => onPatch({ label: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel>Значение</FieldLabel>
            <Input
              value={param.value}
              onChange={e => onPatch({ value: e.target.value })}
              placeholder={stars ? "1, 2 или 3" : ""}
            />
          </Field>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ParamPicker({ params, selected, settings, iconFor, isStarParam, onToggle, onPatch, onAdd }) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      {params.map((prm, i) => (
        <ParamChip
          key={i}
          param={prm}
          active={selected.includes(i)}
          settings={settings}
          icon={iconFor(prm.label)}
          stars={isStarParam(prm.label)}
          onToggle={() => onToggle(i)}
          onPatch={patch => onPatch(i, patch)}
        />
      ))}
      <Button variant="outline" size="sm" onClick={onAdd} className="rounded-full">
        <Plus /> Свой параметр
      </Button>
    </div>
  );
}
