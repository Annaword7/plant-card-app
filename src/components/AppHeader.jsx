import { Leaf, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function AppHeader({ theme, onToggleTheme }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 md:px-8">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Leaf className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-base leading-tight font-medium">RozaRugoza Card Studio</h1>
          <p className="truncate text-xs text-muted-foreground">
            Карточки растений и описания для сайта
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onToggleTheme} aria-label="Сменить тему">
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{theme === "dark" ? "Светлая тема" : "Тёмная тема"}</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
