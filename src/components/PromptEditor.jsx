import { useState } from "react";
import {
  ArrowDown, ArrowUp, ChevronDown, HardDriveDownload, Plus, RotateCcw, Save, Settings2, Trash2, Undo2, X,
} from "lucide-react";
import { ICON_CHOICES } from "@/hooks/use-prompts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "cn";

const Mono = "font-mono text-xs leading-relaxed";

function Confirm({ title, description, action, onConfirm, children }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{action}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function NewTypeDialog({ open, onOpenChange, onCreate }) {
  const [name, setName] = useState("");
  const create = () => {
    onCreate(name);
    setName("");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Новый тип растения</DialogTitle>
          <DialogDescription>
            Характеристики скопируются из открытого типа — останется поправить.
          </DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && name.trim() && create()}
          placeholder="Например: Лилейник"
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Отмена</Button>
          </DialogClose>
          <Button onClick={create} disabled={!name.trim()}>Создать</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ParamRow({ param, index, total, onPatch, onMove, onRemove }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2">
      <Select value={ICON_CHOICES.includes(param.icon) ? param.icon : "•"} onValueChange={v => onPatch({ icon: v })}>
        <SelectTrigger className="w-16 justify-center text-base" aria-label="Иконка">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-16">
          {ICON_CHOICES.map(ic => (
            <SelectItem key={ic} value={ic} className="text-base">{ic}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        value={param.label}
        onChange={e => onPatch({ label: e.target.value })}
        placeholder="Название характеристики"
        className="w-48"
      />
      <Input
        value={param.hint}
        onChange={e => onPatch({ hint: e.target.value })}
        placeholder="Подсказка модели: в каком виде выдать значение"
        className="min-w-52 flex-1"
      />

      <Tooltip>
        <TooltipTrigger asChild>
          <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2 text-xs text-muted-foreground">
            <Switch checked={!!param.stars} onCheckedChange={v => onPatch({ stars: v })} />
            ★
          </label>
        </TooltipTrigger>
        <TooltipContent>Показывать звёздами (значение 1–3)</TooltipContent>
      </Tooltip>

      <div className="flex items-center">
        <Button variant="ghost" size="icon-sm" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Выше">
          <ArrowUp />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => onMove(1)} disabled={index === total - 1} aria-label="Ниже">
          <ArrowDown />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Удалить характеристику">
          <X />
        </Button>
      </div>
    </div>
  );
}

// Редактор промптов и наборов характеристик по типам растений.
export function PromptEditor({ p, open, onOpenChange }) {
  const [advanced, setAdvanced] = useState(false);
  const [newType, setNewType] = useState(false);
  const { draft, draftType } = p;

  return (
    <Card size="sm" className="gap-0 py-0">
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CollapsibleTrigger className="group flex w-full items-center gap-2 px-4 py-3 text-left text-sm">
          <Settings2 className="size-4 text-muted-foreground" />
          <span className="font-medium">Промпты по типам растений</span>
          {p.prompts && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {p.types.length} типов · сейчас «{p.activeType?.label}»
            </span>
          )}
          <span className="ml-auto flex items-center gap-2">
            {p.dirty && <Badge variant="secondary">не сохранено</Badge>}
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </span>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-5 border-t py-4">
            {p.loadFailed && (
              <Alert variant="destructive">
                <AlertTitle>Промпты не загрузились</AlertTitle>
                <AlertDescription>Работают встроенные значения. Обновите страницу.</AlertDescription>
              </Alert>
            )}

            {p.storage && !p.storage.persistent && (
              <Alert>
                <HardDriveDownload />
                <AlertTitle>Хранилище не постоянное</AlertTitle>
                <AlertDescription>
                  Правки сохранятся, но сбросятся при следующем деплое. Подключите в Railway том
                  (Volume) с путём <code className="font-mono">/data</code>.
                </AlertDescription>
              </Alert>
            )}

            {draft && draftType && (
              <>
                <Field>
                  <FieldLabel>Тип растения</FieldLabel>
                  <div className="flex flex-wrap items-center gap-2">
                    {draft.types.map(t => (
                      <Button
                        key={t.id}
                        variant={p.draftTypeId === t.id ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => p.setDraftTypeId(t.id)}
                        className={cn(p.draftTypeId === t.id && "ring-1 ring-primary/40")}
                      >
                        {t.label}
                        {!t.builtin && <span className="text-muted-foreground">✎</span>}
                      </Button>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setNewType(true)}>
                      <Plus /> Добавить тип
                    </Button>
                  </div>
                </Field>

                <div className="flex flex-wrap items-end gap-3">
                  <Field className="min-w-56 flex-1">
                    <FieldLabel htmlFor="type-label">Название типа</FieldLabel>
                    <Input
                      id="type-label"
                      value={draftType.label}
                      onChange={e => p.patchType({ label: e.target.value })}
                    />
                  </Field>
                  {!draftType.builtin && (
                    <Confirm
                      title={`Удалить тип «${draftType.label}»?`}
                      description="Его промпт и набор характеристик будут потеряны."
                      action="Удалить"
                      onConfirm={p.removeType}
                    >
                      <Button variant="destructive">
                        <Trash2 /> Удалить тип
                      </Button>
                    </Confirm>
                  )}
                </div>

                <Field>
                  <FieldLabel htmlFor="type-block">Специфика типа — что учесть в описании</FieldLabel>
                  <FieldDescription>
                    Подставляется в общий промпт вместо <code className="font-mono">{"{{typeBlock}}"}</code>.
                    Пишите по пунктам: на что делать акцент, какие темы взять в FAQ.
                  </FieldDescription>
                  <Textarea
                    id="type-block"
                    rows={10}
                    value={draftType.typeBlock}
                    onChange={e => p.patchType({ typeBlock: e.target.value })}
                    className={Mono}
                  />
                </Field>

                <Field>
                  <FieldLabel>Характеристики для карточки</FieldLabel>
                  <FieldDescription>
                    Порядок тот же, в котором модель выдаёт значения. «★» — рисовать звёздами
                    вместо текста; включайте только там, где значение равно 1, 2 или 3.
                  </FieldDescription>
                  <div className="space-y-2">
                    {draftType.params.map((prm, i) => (
                      <ParamRow
                        key={i}
                        param={prm}
                        index={i}
                        total={draftType.params.length}
                        onPatch={patch => p.patchParam(i, patch)}
                        onMove={dir => p.moveParam(i, dir)}
                        onRemove={() => p.removeParam(i)}
                      />
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={p.addParam} className="self-start">
                    <Plus /> Характеристика
                  </Button>
                </Field>

                <Collapsible open={advanced} onOpenChange={setAdvanced}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="group -ml-2">
                      <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" />
                      Общие промпты для всех типов
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-5 pt-4">
                    <Field>
                      <FieldLabel htmlFor="base-prompt">Промпт описания товара</FieldLabel>
                      <FieldDescription className="font-mono">
                        {"{{plantName}} {{typeLabel}} {{group}} {{breeder}} {{experience}} {{extra}} {{paramsBlock}} {{typeBlock}}"}
                      </FieldDescription>
                      <Textarea
                        id="base-prompt"
                        rows={20}
                        value={draft.basePrompt}
                        onChange={e => p.patchDraft({ basePrompt: e.target.value })}
                        className={Mono}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="params-prompt">Промпт подбора характеристик (шаг 1)</FieldLabel>
                      <FieldDescription className="font-mono">{"{{typeLabel}} {{paramsSpec}}"}</FieldDescription>
                      <Textarea
                        id="params-prompt"
                        rows={12}
                        value={draft.paramsSystemPrompt}
                        onChange={e => p.patchDraft({ paramsSystemPrompt: e.target.value })}
                        className={Mono}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="disclaimer">Фраза в конце описания</FieldLabel>
                      <Textarea
                        id="disclaimer"
                        rows={3}
                        value={draft.disclaimer}
                        onChange={e => p.patchDraft({ disclaimer: e.target.value })}
                      />
                    </Field>
                  </CollapsibleContent>
                </Collapsible>

                <Separator />

                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={p.save} disabled={!p.dirty || p.saving}>
                    <Save /> Сохранить
                  </Button>
                  <Button variant="outline" onClick={p.revert} disabled={!p.dirty || p.saving}>
                    <Undo2 /> Отменить правки
                  </Button>
                  <span className="flex-1" />
                  {draftType.builtin && (
                    <Confirm
                      title={`Сбросить «${draftType.label}»?`}
                      description="Специфика и характеристики этого типа вернутся к заводским. Остальные типы не изменятся."
                      action="Сбросить"
                      onConfirm={() => p.reset("type")}
                    >
                      <Button variant="ghost" size="sm">
                        <RotateCcw /> Сбросить «{draftType.label}»
                      </Button>
                    </Confirm>
                  )}
                  <Confirm
                    title="Сбросить все промпты?"
                    description="Все типы, общие промпты и финальная фраза вернутся к заводским. Свои типы будут удалены."
                    action="Сбросить всё"
                    onConfirm={() => p.reset("all")}
                  >
                    <Button variant="destructive" size="sm">
                      <RotateCcw /> Сбросить всё
                    </Button>
                  </Confirm>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      <NewTypeDialog open={newType} onOpenChange={setNewType} onCreate={p.addType} />
    </Card>
  );
}
