"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Heart, Library, Link2, ListMusic, Play, Plus, Search, Shuffle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CourseCover } from "@/components/courses/course-cover";
import { sortCourses } from "@/components/courses/courses-view";
import { continueCourse, courseStats, lessonTitle, nextLessonToWatch } from "@/lib/courses";
import { Skeleton } from "@/components/ui/skeleton";
import { STARTER_VIDEOS } from "@/components/dialogs/add-video-dialog";
import { HydrationGate } from "@/components/hydration-gate";
import { PageIntro } from "@/components/page-header";
import { TodayStats } from "@/components/home/today-stats";
import { PlaylistCard } from "@/components/playlist/playlist-card";
import { PlaylistCover } from "@/components/playlist/playlist-cover";
import { VideoCard } from "@/components/video/video-card";
import { addVideosToLibrary, playList } from "@/lib/actions";
import { cn, formatTotalDuration, pluralize } from "@/lib/utils";
import { parseManyVideoIds } from "@/lib/youtube";
import { courseLessons, isInLibrary, sortByAddedDesc, useLibrary } from "@/stores/library-store";
import { usePlayer, type QueueSource } from "@/stores/player-store";
import { useUi } from "@/stores/ui-store";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function HomeView() {
  return (
    <HydrationGate fallback={<HomeSkeleton />}>
      <Home />
    </HydrationGate>
  );
}

function HomeSkeleton() {
  return (
    <div className="px-4 pt-8 md:px-8">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="mt-2 h-4 w-56" />
      <div className="mt-6 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/** "Terça-feira, 10 de novembro" */
function today() {
  const text = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Home() {
  const videos = useLibrary((s) => s.videos);
  const favorites = useLibrary((s) => s.favorites);
  const playlists = useLibrary((s) => s.playlists);
  const recent = useLibrary((s) => s.recent);
  const courses = useLibrary((s) => s.courses);

  const all = useMemo(() => sortByAddedDesc(videos), [videos]);
  const recentIds = useMemo(() => recent.filter((id) => isInLibrary(videos[id])).slice(0, 10), [recent, videos]);
  const favoriteIds = useMemo(() => favorites.filter((id) => videos[id]), [favorites, videos]);
  const totalDuration = all.reduce((sum, v) => sum + (v.duration ?? 0), 0);

  if (all.length === 0 && courses.length === 0) return <Onboarding />;

  return (
    <div className="pb-16">
      <PageIntro title={greeting()} description={today()} />

      <div className="flex flex-col gap-10 px-4 md:px-8">
        {all.length > 0 && <QuickAccess favoriteIds={favoriteIds} allIds={all.map((v) => v.id)} />}

        <TodayStats />

        <ContinueLearning />

        {recentIds.length > 0 && (
          <Section title="Tocados recentemente">
            <CardGrid ids={recentIds} source={{ type: "custom", label: "Tocados recentemente" }} />
          </Section>
        )}

        {playlists.length > 0 && (
          <Section title="Suas playlists" href="/playlists">
            <div className="stagger -mx-2.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {playlists.slice(0, 6).map((p) => (
                <PlaylistCard key={p.id} playlist={p} className="[&:nth-child(n+5)]:max-xl:hidden [&:nth-child(n+6)]:max-2xl:hidden" />
              ))}
            </div>
          </Section>
        )}

        {favoriteIds.length > 0 && (
          <Section title="Favoritos" href="/favorites">
            <CardGrid ids={favoriteIds.slice(0, 10)} source={{ type: "favorites", label: "Favoritos" }} />
          </Section>
        )}

        {all.length > 0 && (
          <Section title="Adicionados recentemente" href="/library">
            <CardGrid ids={all.slice(0, 10).map((v) => v.id)} source={{ type: "library", label: "Biblioteca" }} />
          </Section>
        )}

        {all.length > 0 && (
          <p className="border-t pt-5 text-xs text-muted-foreground">
            {pluralize(all.length, "vídeo", "vídeos")} na biblioteca
            {totalDuration > 0 && ` · ${formatTotalDuration(totalDuration)} de conteúdo`} · salvo apenas neste navegador
          </p>
        )}
      </div>
    </div>
  );
}

/** Primeiro uso: explica o app em uma tela e já oferece por onde começar. */
function Onboarding() {
  const [value, setValue] = useState("");
  const ids = useMemo(() => parseManyVideoIds(value), [value]);
  const router = useRouter();
  const { openPlaylistDialog, openCourseDialog } = useUi.getState();

  const submit = () => {
    if (!ids.length) {
      // Não é link: vira uma busca no YouTube.
      router.push(`/search?q=${encodeURIComponent(value.trim())}`);
      return;
    }
    addVideosToLibrary(ids);
    playList(ids, 0, { type: "custom", label: "Adicionado agora" });
    setValue("");
  };

  const startWith = (id: string, label: string) => {
    addVideosToLibrary([id]);
    playList([id], 0, { type: "custom", label });
  };

  const steps = [
    { icon: Link2, title: "Adicione", text: "Cole links do YouTube em qualquer formato, ou busque sem sair do app." },
    { icon: ListMusic, title: "Organize", text: "Favoritos, playlists e cursos com seções, progresso e anotações." },
    { icon: Play, title: "Dê play", text: "Fila, mini player e atalhos de teclado enquanto você trabalha." },
  ];

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.25rem)] w-full max-w-2xl flex-col justify-center px-4 pt-4 pb-20 md:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-balance">O YouTube que funciona no trabalho.</h1>
      <p className="mt-2 text-[15px] text-pretty text-muted-foreground">
        Monte sua biblioteca de músicas e aulas e toque tudo aqui dentro. Nada sai do seu navegador.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-7 flex items-center gap-2 rounded-lg border bg-card p-1.5 pl-3.5 shadow-soft transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30"
      >
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Cole um link do YouTube ou busque um vídeo…"
          className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Buscar ou colar link do YouTube"
        />
        {ids.length > 0 && (
          <span className="hidden text-xs text-muted-foreground sm:block">
            {pluralize(ids.length, "vídeo encontrado", "vídeos encontrados")}
          </span>
        )}
        <Button type="submit" disabled={!value.trim()}>
          {ids.length ? <Play className="fill-current" /> : <Search />}
          {ids.length ? "Tocar" : "Buscar"}
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2 text-[13px] text-muted-foreground">
        <span className="mr-1">Ou comece com uma rádio:</span>
        {STARTER_VIDEOS.map((s) => (
          <Button key={s.id} variant="outline" size="sm" className="h-7" onClick={() => startWith(s.id, s.label)}>
            <Play className="size-3 fill-current" /> {s.label}
          </Button>
        ))}
      </div>

      <dl className="stagger mt-12 grid gap-6 border-t pt-8 sm:grid-cols-3">
        {steps.map((s) => (
          <div key={s.title}>
            <dt className="flex items-center gap-2 text-sm font-medium">
              <s.icon className="size-4 text-muted-foreground" /> {s.title}
            </dt>
            <dd className="mt-1.5 text-[13px] text-pretty text-muted-foreground">{s.text}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => openPlaylistDialog()}>
          <Plus /> Criar playlist
        </Button>
        <Button variant="secondary" size="sm" onClick={() => openCourseDialog()}>
          <Plus /> Criar curso
        </Button>
      </div>
    </div>
  );
}

function QuickAccess({ favoriteIds, allIds }: { favoriteIds: string[]; allIds: string[] }) {
  const playlists = useLibrary((s) => s.playlists);
  const videos = useLibrary((s) => s.videos);
  const source = usePlayer((s) => s.source);

  const tiles: {
    key: string;
    href: string;
    label: string;
    cover: React.ReactNode;
    ids: string[];
    source: QueueSource;
  }[] = [
    {
      key: "favorites",
      href: "/favorites",
      label: "Favoritos",
      cover: (
        <div className="grid size-full place-items-center bg-muted text-foreground/80">
          <Heart className="size-[18px]" />
        </div>
      ),
      ids: favoriteIds,
      source: { type: "favorites", label: "Favoritos" },
    },
    {
      key: "library",
      href: "/library",
      label: "Biblioteca",
      cover: (
        <div className="grid size-full place-items-center bg-muted text-foreground/80">
          <Library className="size-[18px]" />
        </div>
      ),
      ids: allIds,
      source: { type: "library", label: "Biblioteca" },
    },
    ...playlists.slice(0, 6).map((p) => ({
      key: p.id,
      href: `/playlists/${p.id}`,
      label: p.name,
      cover: <PlaylistCover videoIds={p.videoIds} className="size-full" iconClassName="size-[18px]" />,
      ids: p.videoIds.filter((id) => videos[id]),
      source: { type: "playlist" as const, id: p.id, label: p.name },
    })),
  ];

  return (
    <div className="stagger grid grid-cols-2 gap-2 xl:grid-cols-4">
      {tiles.map((t) => {
        const active = source?.type === t.source.type && source.id === t.source.id;
        return (
          <div
            key={t.key}
            className={cn(
              "group/tile relative flex h-12 items-center gap-2.5 overflow-hidden rounded-lg border bg-card pr-3 transition-colors hover:bg-accent/70 sm:h-14 sm:gap-3",
              active && "border-foreground/20"
            )}
          >
            <Link href={t.href} className="absolute inset-0" aria-label={t.label} />
            <div className="pointer-events-none size-14 shrink-0 overflow-hidden border-r max-sm:size-12">{t.cover}</div>
            <span className={cn("pointer-events-none min-w-0 flex-1 truncate text-sm font-medium", active && "text-primary")}>
              {t.label}
            </span>
            {t.ids.length > 0 && (
              <div className="absolute inset-y-0 right-0 flex items-center gap-1 bg-gradient-to-l from-accent from-70% to-transparent pr-2.5 pl-8 opacity-0 transition-opacity group-hover/tile:opacity-100 focus-within:opacity-100">
                <Button
                  size="icon-sm"
                  variant="ghost"
                 
                  aria-label={`Aleatório: ${t.label}`}
                  onClick={() => playList(t.ids, 0, t.source, true)}
                >
                  <Shuffle />
                </Button>
                <Button
                  size="icon"
                 
                 
                  aria-label={`Tocar ${t.label}`}
                  onClick={() => playList(t.ids, 0, t.source)}
                >
                  <Play className="ml-0.5 fill-current" />
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Cursos em andamento, com a próxima aula e um botão para continuar. */
function ContinueLearning() {
  const courses = useLibrary((s) => s.courses);
  const progress = useLibrary((s) => s.progress);
  const videos = useLibrary((s) => s.videos);
  const active = sortCourses(courses, progress, videos)
    .filter((c) => {
      const stats = courseStats(c, progress, videos);
      return stats.total > 0 && stats.completed < stats.total;
    })
    .slice(0, 3);
  if (!active.length) return null;

  return (
    <Section title={active.some((c) => c.lastOpenedAt) ? "Continue aprendendo" : "Seus cursos"} href="/courses">
      <div className="stagger grid gap-2.5 lg:grid-cols-2 2xl:grid-cols-3">
        {active.map((course) => {
          const stats = courseStats(course, progress, videos);
          const next = nextLessonToWatch(course, progress);
          const number = next ? courseLessons(course).findIndex((l) => l.id === next.id) + 1 : 0;
          return (
            <div
              key={course.id}
              className="group/cl relative flex items-center gap-3.5 rounded-lg border bg-card p-2.5 pr-3.5 transition-colors hover:border-foreground/20"
            >
              <Link href={`/courses/${course.id}`} className="absolute inset-0 rounded-lg" aria-label={course.title} />
              <CourseCover course={course} className="pointer-events-none w-28 shrink-0 rounded-md ring-1 ring-foreground/[0.06] sm:w-32" />
              <div className="pointer-events-none min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{course.title}</p>
                {next && (
                  <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                    Aula {number} · {lessonTitle(next, videos)}
                  </p>
                )}
                <div className="mt-2.5 flex items-center gap-2.5">
                  <Progress value={stats.percent} className="flex-1" />
                  <span className="text-xs text-muted-foreground tabular-nums">{stats.percent}%</span>
                </div>
              </div>
              <Button
                size="icon"
                className="relative shrink-0 rounded-full"
                aria-label={`Continuar ${course.title}`}
                onClick={() => continueCourse(course.id)}
              >
                <Play className="ml-0.5 fill-current" />
              </Button>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between gap-4">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {href && (
          <Link
            href={href}
            className="-mr-1 flex items-center gap-0.5 rounded-md px-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Ver tudo <ChevronRight className="size-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function CardGrid({ ids, source }: { ids: string[]; source: QueueSource }) {
  return (
    <div className="stagger -mx-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {ids.map((id, i) => (
        <VideoCard key={id} id={id} onPlay={() => playList(ids, i, source)} />
      ))}
    </div>
  );
}
