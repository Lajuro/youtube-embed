"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ChevronLeft, ChevronRight, Menu, Moon, Plus, Search, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUi } from "@/stores/ui-store";

export function TopBar() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { setCommandOpen, openAddDialog, setMobileNavOpen } = useUi.getState();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-transparent bg-background/60 px-4 backdrop-blur-xl md:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Abrir menu">
        <Menu />
      </Button>
      <div className="hidden items-center gap-1 md:flex">
        <Button variant="ghost" size="icon-sm" className="rounded-full bg-foreground/5" onClick={() => router.back()} aria-label="Voltar">
          <ChevronLeft />
        </Button>
        <Button variant="ghost" size="icon-sm" className="rounded-full bg-foreground/5" onClick={() => router.forward()} aria-label="Avançar">
          <ChevronRight />
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="group/search flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-full border bg-foreground/[0.04] px-4 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-foreground/[0.07] md:ml-2 md:max-w-md"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">Buscar ou colar um link do YouTube…</span>
        <KbdGroup className="ml-auto hidden sm:inline-flex">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label="Alternar tema"
            >
              <Sun className="hidden dark:block" />
              <Moon className="dark:hidden" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Alternar tema</TooltipContent>
        </Tooltip>
        <Button variant="brand" className="rounded-full max-sm:size-10 max-sm:p-0" onClick={() => openAddDialog()}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Adicionar</span>
        </Button>
      </div>
    </header>
  );
}
