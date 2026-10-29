"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Clock3,
  GraduationCap,
  Coffee,
  Heart,
  Library,
  ListMusic,
  Play,
  Plus,
  Search,
  Shuffle,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CourseCover } from "@/components/courses/course-cover";
import { sortCourses } from "@/components/courses/courses-view";
import { continueCourse, courseStats, lessonTitle, nextLessonToWatch } from "@/lib/courses";
import { Skeleton } from "@/components/ui/skeleton";
import { STARTER_VIDEOS } from "@/components/dialogs/add-video-dialog";
import { HydrationGate } from "@/components/hydration-gate";
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
    <div className="px-4 py-6 md:px-8">
      <Skeleton className="h-64 w-full rounded-3xl" />
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
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
  const isEmpty = all.length === 0 && courses.length === 0;

  return (
    <div className="pb-16">
      <Hero isEmpty={isEmpty} />

      <div className="flex flex-col gap-12 px-4 md:px-8">
        {isEmpty ? (
          <Onboarding />
        ) : (
          <>
            {all.length > 0 && <QuickAccess favoriteIds={favoriteIds} allIds={all.map((v) => v.id)} />}

            <TodayStats />

            <ContinueLearning />

            {recentIds.length > 0 && (
              <Section title="Tocados recentemente" icon={Clock3}>
                <CardGrid ids={recentIds} source={{ type: "custom", label: "Tocados recentemente" }} />
              </Section>
            )}

            {playlists.length > 0 && (
              <Section title="Suas playlists" icon={ListMusic} href="/playlists">
                <div className="stagger -mx-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                  {playlists.slice(0, 6).map((p) => (
                    <PlaylistCard key={p.id} playlist={p} className="[&:nth-child(n+5)]:max-xl:hidden [&:nth-child(n+6)]:max-2xl:hidden" />
                  ))}
                </div>
              </Section>
            )}

            {favoriteIds.length > 0 && (
              <Section title="Seus favoritos" icon={Heart} href="/favorites">
                <CardGrid ids={favoriteIds.slice(0, 10)} source={{ type: "favorites", label: "Favoritos" }} />
              </Section>
            )}

            {all.length > 0 && (
              <Section title="Adicionados recentemente" icon={Sparkles} href="/library">
                <CardGrid ids={all.slice(0, 10).map((v) => v.id)} source={{ type: "library", label: "Biblioteca" }} />
              </Section>
            )}

            <p className="text-center text-xs text-muted-foreground">
              {pluralize(all.length, "vídeo", "vídeos")} na biblioteca
              {totalDuration > 0 && ` · ${formatTotalDuration(totalDuration)} de conteúdo`} · salvo só neste navegador
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Hero({ isEmpty }: { isEmpty: boolean }) {
  const [value, setValue] = useState("");
  const ids = useMemo(() => parseManyVideoIds(value), [value]);
  const router = useRouter();

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

  return (
    <section className="relative -mt-14 overflow-hidden px-4 pt-18 pb-10 md:px-8 md:pt-20 md:pb-12">
      {/* Gradiente "mesh" no fundo */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-32 -left-24 size-[28rem] rounded-full bg-[var(--brand-from)] opacity-25 blur-[100px]" />
        <div className="absolute -top-20 right-0 size-[24rem] rounded-full bg-[var(--brand-to)] opacity-20 blur-[100px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        <div className="bg-noise absolute inset-0 opacity-[0.035] mix-blend-overlay" />
      </div>

      <div className="relative max-w-3xl">
        <p className="text-sm font-medium text-muted-foreground">{greeting()} 👋</p>
        <h1 className="mt-1.5 text-3xl font-extrabold tracking-tight text-balance md:text-4xl xl:text-5xl">
          {isEmpty ? (
            <>
              Sua trilha sonora para <span className="text-gradient">focar</span>.
            </>
          ) : (
            <>
              O que vamos <span className="text-gradient">ouvir</span> hoje?
            </>
          )}
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Busque um vídeo ou cole um link do YouTube e dê play. Monte playlists de lofi, jazz ou o que te ajudar a
          trabalhar — tudo guardado no seu navegador.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="group/hero mt-6 flex items-center gap-2 rounded-full border bg-background/70 p-1.5 pl-5 shadow-xl shadow-black/5 backdrop-blur-xl transition-[border-color,box-shadow] focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/15"
        >
          <Search className="size-5 shrink-0 text-muted-foreground transition-colors group-focus-within/hero:text-primary" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Buscar no YouTube ou colar um link…"
            className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            aria-label="Buscar ou colar link do YouTube"
          />
          {ids.length > 0 && (
            <span className="hidden text-xs text-muted-foreground sm:block">
              {pluralize(ids.length, "vídeo encontrado", "vídeos encontrados")}
            </span>
          )}
          <Button type="submit" variant="brand" size="lg" className="rounded-full" disabled={!value.trim()}>
            {ids.length ? <Play className="fill-current" /> : <Search />}
            <span className="hidden sm:inline">{ids.length ? "Tocar" : "Buscar"}</span>
          </Button>
        </form>
      </div>
    </section>
  );
}

function Onboarding() {
  const openPlaylistDialog = useUi((s) => s.openPlaylistDialog);
  const startWith = (id: string, label: string) => {
    addVideosToLibrary([id]);
    playList([id], 0, { type: "custom", label });
  };

  const steps = [
    { icon: Search, title: "Busque ou cole um link", text: "Pesquise direto no app ou cole links em qualquer formato: watch, youtu.be, shorts, live." },
    { icon: ListMusic, title: "Organize", text: "Favorite e monte playlists para cada momento do dia." },
    { icon: Coffee, title: "Dê play e foque", text: "Fila, aleatório, repetir e mini player enquanto você trabalha." },
  ];

  return (
    <div className="grid gap-8">
      <div className="stagger grid gap-3 md:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="relative overflow-hidden rounded-2xl border bg-card/60 p-5 backdrop-blur">
            <span className="absolute top-3 right-4 text-5xl font-black text-foreground/[0.05]">{i + 1}</span>
            <div className="mb-3 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <s.icon className="size-5" />
            </div>
            <h3 className="font-semibold">{s.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-start gap-4 rounded-2xl border bg-gradient-to-br from-primary/10 via-transparent to-transparent p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-4 text-primary" /> Quer começar agora?
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Experimente uma das rádios 24 horas do Lofi Girl — perfeitas para trabalhar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {STARTER_VIDEOS.map((s) => (
            <Button key={s.id} variant="outline" className="rounded-full" onClick={() => startWith(s.id, s.label)}>
              <Play className="fill-current" /> {s.label}
            </Button>
          ))}
          <Button variant="ghost" className="rounded-full" onClick={() => openPlaylistDialog()}>
            <Plus /> Criar playlist
          </Button>
        </div>
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
        <div className="grid size-full place-items-center bg-brand-gradient text-white">
          <Heart className="size-5 fill-current" />
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
        <div className="grid size-full place-items-center bg-gradient-to-br from-sky-500 to-indigo-600 text-white">
          <Library className="size-5" />
        </div>
      ),
      ids: allIds,
      source: { type: "library", label: "Biblioteca" },
    },
    ...playlists.slice(0, 6).map((p) => ({
      key: p.id,
      href: `/playlists/${p.id}`,
      label: p.name,
      cover: <PlaylistCover seed={p.id} videoIds={p.videoIds} className="size-full" iconClassName="size-5" />,
      ids: p.videoIds.filter((id) => videos[id]),
      source: { type: "playlist" as const, id: p.id, label: p.name },
    })),
  ];

  return (
    <div className="stagger -mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((t) => {
        const active = source?.type === t.source.type && source.id === t.source.id;
        return (
          <div
            key={t.key}
            className={cn(
              "group/tile relative flex h-16 items-center gap-3 overflow-hidden rounded-xl border bg-card/60 pr-3 backdrop-blur transition-colors hover:bg-accent/70",
              active && "border-primary/40"
            )}
          >
            <Link href={t.href} className="absolute inset-0" aria-label={t.label} />
            <div className="pointer-events-none size-16 shrink-0 overflow-hidden">{t.cover}</div>
            <span className={cn("pointer-events-none min-w-0 flex-1 truncate font-semibold", active && "text-primary")}>
              {t.label}
            </span>
            {t.ids.length > 0 && (
              <div className="absolute inset-y-0 right-0 flex items-center gap-1 bg-gradient-to-l from-accent via-accent/90 to-transparent pr-3 pl-8 opacity-0 transition-opacity group-hover/tile:opacity-100 focus-within:opacity-100">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="rounded-full"
                  aria-label={`Aleatório: ${t.label}`}
                  onClick={() => playList(t.ids, 0, t.source, true)}
                >
                  <Shuffle />
                </Button>
                <Button
                  size="icon"
                  variant="brand"
                  className="rounded-full"
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
    <Section title={active.some((c) => c.lastOpenedAt) ? "Continue aprendendo" : "Seus cursos"} icon={GraduationCap} href="/courses">
      <div className="stagger grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {active.map((course) => {
          const stats = courseStats(course, progress, videos);
          const next = nextLessonToWatch(course, progress);
          const number = next ? courseLessons(course).findIndex((l) => l.id === next.id) + 1 : 0;
          return (
            <div
              key={course.id}
              className="group/cl relative flex items-center gap-4 overflow-hidden rounded-2xl border bg-card/60 p-3 transition-colors hover:border-primary/40"
            >
              <Link href={`/courses/${course.id}`} className="absolute inset-0" aria-label={course.title} />
              <CourseCover course={course} className="pointer-events-none w-32 shrink-0 rounded-xl sm:w-40" />
              <div className="pointer-events-none min-w-0 flex-1">
                <p className="truncate font-semibold">{course.title}</p>
                {next && (
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    Aula {number}: {lessonTitle(next, videos)}
                  </p>
                )}
                <Progress value={stats.percent} className="mt-3" />
                <p className="mt-1 text-xs text-muted-foreground">{stats.percent}% concluído</p>
              </div>
              <Button
                size="icon-lg"
                variant="brand"
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

function Section({
  title,
  icon: Icon,
  href,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-4">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight md:text-2xl">
          <Icon className="size-5 text-primary" />
          {title}
        </h2>
        {href && (
          <Link
            href={href}
            className="group/more flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Ver tudo <ArrowRight className="size-4 transition-transform group-hover/more:translate-x-0.5" />
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
