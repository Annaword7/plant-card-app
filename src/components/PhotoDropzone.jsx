import { useRef } from "react";
import { Camera, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

// Фото растения: клик по рамке открывает выбор файла (на телефоне — камеру).
export function PhotoDropzone({ photo, onPhoto, className }) {
  const inputRef = useRef();

  const pick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className={cn("relative size-44 shrink-0", className)}>
      <button
        type="button"
        onClick={() => inputRef.current.click()}
        className={cn(
          "flex size-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed text-muted-foreground transition-colors",
          photo ? "border-transparent" : "hover:border-primary/60 hover:text-foreground"
        )}
      >
        {photo ? (
          <img src={photo} alt="Фото растения" className="size-full object-cover" />
        ) : (
          <>
            <Camera className="size-7" />
            <span className="px-3 text-center text-xs">Загрузить фото<br />или снять на камеру</span>
          </>
        )}
      </button>
      {photo && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current.click()}
          className="absolute right-2 bottom-2 shadow-sm"
        >
          <Pencil /> Заменить
        </Button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={pick} className="hidden" />
    </div>
  );
}
