import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono, Newsreader } from "next/font/google";
import { FloatingChat } from "@/components/floating-chat";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { getPresenceConfig } from "@/lib/config";
import { resolveThemeConfig } from "@/lib/config/themes";
import "katex/dist/katex.min.css";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const config = getPresenceConfig();
const themeConfig = resolveThemeConfig(config);
const themePresets = Object.entries(themeConfig.presets).map(([id, preset]) => ({
  id,
  ...preset,
}));

export const metadata: Metadata = {
  title: {
    default: `${config.fullName} · Presence`,
    template: `%s · ${config.name}`,
  },
  description: config.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme={themeConfig.defaultTheme} suppressHydrationWarning>
      <body
        className={`${newsreader.variable} ${dmSans.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <ThemeProvider
          defaultTheme={themeConfig.defaultTheme}
          presets={themePresets}
        >
          <div className="relative z-10 flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
          <FloatingChat
            siteName={config.name}
            enabled={config.modules.chat}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
