import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import MobileHeader from "@/components/MobileHeader";
import { geistMono, geistSans } from "@/app/fonts";
import { getThemeInitScript } from "@/lib/theme";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
      </head>
      <body className="bg-background text-foreground antialiased">
        <NextIntlClientProvider messages={messages}>
          <MobileHeader />
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="app-main flex-1 overflow-y-auto min-h-screen">
              {children}
            </main>
          </div>
          <BottomNav />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
