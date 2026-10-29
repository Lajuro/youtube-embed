import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { AppShell } from "@/components/layout/app-shell";
import { Providers } from "@/components/providers";
import { ACCENT_BOOT_SCRIPT } from "@/lib/accents";
import { INSTALL_BOOT_SCRIPT } from "@/lib/pwa";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sintonia",
  description: "Seu player de vídeos do YouTube: playlists, favoritos e fila — tudo salvo no seu navegador.",
  applicationName: "Sintonia",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#121016" },
    { media: "(prefers-color-scheme: light)", color: "#fbfafd" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable} dark h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ACCENT_BOOT_SCRIPT + INSTALL_BOOT_SCRIPT }} />
      </head>
      <body className="h-full overflow-hidden">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
