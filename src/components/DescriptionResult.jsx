import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { boldQuestions, cleanText, convertToHtml, inlineParts, toBlocks } from "@/lib/markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

function Blocks({ text }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {toBlocks(text).map((block, bi) =>
        block.type === "table" ? (
          <Table key={bi} className="my-2">
            <TableBody>
              {block.rows.map((row, ri) => (
                <TableRow key={ri}>
                  <TableCell className="w-2/5 align-top font-medium whitespace-normal">{row[0]}</TableCell>
                  <TableCell className="whitespace-normal">{row[1]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : block.type === "list" ? (
          <ul key={bi} className="list-disc space-y-1 pl-5">
            {block.items.map((item, ii) => (
              <li key={ii}>
                {inlineParts(item).map((part, pi) =>
                  part.bold ? <strong key={pi}>{part.text}</strong> : <span key={pi}>{part.text}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p key={bi}>
            {inlineParts(block.text).map((part, pi) =>
              part.bold ? <strong key={pi}>{part.text}</strong> : <span key={pi}>{part.text}</span>
            )}
          </p>
        )
      )}
    </div>
  );
}

// Готовое описание: вкладка «для сайта» со всем текстом сразу и отдельные разделы.
export function DescriptionResult({ sections, disclaimer }) {
  const [format, setFormat] = useState("raw");
  const [copied, setCopied] = useState(null);

  const faq = boldQuestions(sections.faq);
  const combined = [
    sections.main && `**Описание**\n${sections.main}`,
    sections.table && `**Характеристики**\n${sections.table}`,
    faq && `**Вопрос — Ответ**\n${faq}`,
    disclaimer,
  ].filter(Boolean).join("\n\n");

  const tabs = [
    { key: "combined", label: "Для сайта", text: combined },
    { key: "meta", label: "Мета-теги", text: sections.meta },
    { key: "intro", label: "Краткое", text: sections.intro },
    { key: "main", label: "Описание", text: sections.main },
    { key: "table", label: "Характеристики", text: sections.table },
    { key: "faq", label: "Вопрос — Ответ", text: faq },
  ].filter(t => t.text);

  const copy = async (key, text) => {
    const content = format === "html" ? convertToHtml(text) : cleanText(text);
    try {
      await navigator.clipboard.writeText(content);
      setCopied(key);
      setTimeout(() => setCopied(c => (c === key ? null : c)), 2000);
      toast.success(format === "html" ? "Скопировано с HTML-тегами" : "Скопирован чистый текст");
    } catch {
      toast.error("Браузер не дал доступ к буферу обмена");
    }
  };

  return (
    <Card className="mt-5">
      <CardHeader className="border-b pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Готовое описание</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Копировать как</span>
            <ToggleGroup
              type="single"
              value={format}
              onValueChange={v => v && setFormat(v)}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="raw">Текст</ToggleGroupItem>
              <ToggleGroupItem value="html">HTML</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue={tabs[0]?.key}>
          {/* На узком экране ряд вкладок прокручивается: переносить его нельзя,
              у TabsList фиксированная высота */}
          <TabsList className="mb-3 max-w-full justify-start overflow-x-auto">
            {tabs.map(t => (
              <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
            ))}
          </TabsList>

          {tabs.map(t => (
            <TabsContent key={t.key} value={t.key} className="space-y-3">
              <Button variant="outline" size="sm" onClick={() => copy(t.key, t.text)}>
                {copied === t.key ? <Check /> : <Copy />}
                {copied === t.key ? "Скопировано" : "Скопировать"}
              </Button>
              <div className="rounded-lg border bg-muted/30 p-4">
                <Blocks text={t.text} />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
