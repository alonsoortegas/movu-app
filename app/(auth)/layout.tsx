import type { Viewport } from "next";
import "../globals.css";
import { geistMono, geistSans } from "@/app/fonts";
import { getThemeInitScript } from "@/lib/theme";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
      </head>
      <body className="auth-shell min-h-screen bg-background text-foreground antialiased flex items-center justify-center p-4">
        {children}
      </body>
    </html>
  );
}
