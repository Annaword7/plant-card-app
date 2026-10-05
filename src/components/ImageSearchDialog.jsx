import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";

function ResultTile({ image, picking, onPick }) {
  return (
    <figure className="group relative overflow-hidden rounded-lg border bg-muted/40">
      <button
        type="button"
        onClick={onPick}
        disabled={!!picking}
        className="block w-full cursor-pointer disabled:cursor-wait"
        title={image.title}
      >
        <img
          src={image.thumb}
          alt={image.title}
          loading="lazy"
          // Превью у части источников отдаётся через их прокси и иногда отваливается —
          // тогда показываем саму картинку
          onError={e => {
            if (e.currentTarget.src !== image.full) e.currentTarget.src = image.full;
          }}
          className={cn(
            "aspect-square w-full object-cover transition-transform group-hover:scale-105",
            picking === image.id && "opacity-50"
          )}
        />
        {picking === image.id && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="size-6 animate-spin" />
          </span>
        )}
      </button>

      <figcaption className="space-y-0.5 border-t bg-card p-2 text-[11px] leading-tight text-muted-foreground">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate font-medium text-foreground">
            {image.width}×{image.height}
          </span>
          <a
            href={image.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 hover:text-foreground"
            title="Открыть источник"
          >
            <ExternalLink className="size-3" />
          </a>
        </div>
        <div className="truncate" title={`${image.author} · ${image.source}`}>
          {image.author}
        </div>
        <div className="truncate" title={image.license}>{image.license}</div>
      </figcaption>
    </figure>
  );
}

// Поиск фото растения в открытых источниках. Выбранную картинку скачивает
// сервер: внешний файл «пачкает» canvas, и карточку уже не выгрузить в JPG.
export function ImageSearchDialog({ open, onOpenChange, plantName, typeId, onPick }) {
  const [query, setQuery] = useState("");
  const [images, setImages] = useState([]);
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [picking, setPicking] = useState(null);
  const [searched, setSearched] = useState(false);

  const run = useCallback(async (custom) => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch("/api/image-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plantName, typeId, query: custom }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Поиск не ответил");
      setImages(data.images);
      setQueries(data.queries);
      if (!data.images.length) {
        toast.warning("Ничего не нашлось", {
          description: "Попробуйте уточнить запрос — например, латинское название",
        });
      }
    } catch (e) {
      toast.error("Поиск не удался", { description: e.message });
      setImages([]);
    }
    setLoading(false);
  }, [plantName, typeId]);

  // При каждом открытии ищем заново: название могло поменяться
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setImages([]);
    setQueries([]);
    setSearched(false);
    run();
  }, [open, run]);

  const pick = async (image) => {
    setPicking(image.id);
    try {
      const res = await fetch("/api/fetch-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: image.full }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не скачалось");
      onPick(data.dataUrl);
      onOpenChange(false);
      toast.success("Фото загружено", {
        description: `${image.author} · ${image.license}`,
      });
    } catch (e) {
      toast.error("Картинка не загрузилась", { description: e.message });
    }
    setPicking(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Фото из интернета</DialogTitle>
          <DialogDescription>
            Крупные снимки из открытых источников. Под каждым — автор и лицензия:
            большинство требует указать авторство.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && run(query)}
            placeholder={queries[0] || plantName}
          />
          <Button variant="outline" onClick={() => run(query)} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Search />}
            Искать
          </Button>
        </div>

        {!!queries.length && !query && (
          <p className="text-xs text-muted-foreground">
            Искали по: {queries.join(" · ")}
          </p>
        )}

        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : images.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {images.map(img => (
                <ResultTile
                  key={img.id}
                  image={img}
                  picking={picking}
                  onPick={() => pick(img)}
                />
              ))}
            </div>
          ) : searched ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Ничего не нашлось. Попробуйте латинское название — например,
              «Hydrangea paniculata Polar Bear».
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
