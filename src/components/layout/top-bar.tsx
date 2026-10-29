"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ChevronLeft, ChevronRight, Menu, Moon, Plus, Search, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Logo } from "@/components/layout/sidebar";
import { TimerButton } from "@/components/timers/timer-popover";
import { TOP_BAR_HEIGHT } from "@/lib/layout";
import { useUi } from "@/stores/ui-store";

export function TopBar() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { setCommandOpen, openAddDialog, setMobileNavOpen } = useUi.getState();

  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-2 bg-background/65 px-3 backdrop-blur-xl md:px-5"
      style={{ height: TOP_BAR_HEIGHT }}
    >
      <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Abrir menu">
        <Menu />
      </Button>
      <Logo compact className="mr-1 lg:hidden" />
      <div className="hidden items-center md:flex">
        <Button variant="ghost" size="icon-sm" className="rounded-full text-muted-foreground" onClick={() => router.back()} aria-label="Voltar">
          <ChevronLeft />
        </Button>
        <Button variant="ghost" size="icon-sm" className="rounded-full text-muted-foreground" onClick={() => router.forward()} aria-label="Avançar">
          <ChevronRight />
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="flex h-9 min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-full border border-transparent bg-foreground/[0.06] px-3.5 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-foreground/[0.08] md:max-w-md"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">Buscar ou colar um link do YouTube…</span>
        <KbdGroup className="ml-auto hidden sm:inline-flex">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <TimerButton />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full text-muted-foreground"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label="Alternar tema"
            >
              <Sun className="hidden dark:block" />
              <Moon className="dark:hidden" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Alternar tema</TooltipContent>
        </Tooltip>
        <Button variant="brand" size="sm" className="h-9 rounded-full px-4 max-sm:size-9 max-sm:p-0" onClick={() => openAddDialog()}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Adicionar</span>
        </Button>
      </div>
    </header>
  );
}
