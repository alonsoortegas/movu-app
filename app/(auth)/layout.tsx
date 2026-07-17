import "../globals.css";
import { geistMono, geistSans } from "@/app/fonts";
import { getThemeInitScript } from "@/lib/theme";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased flex items-center justify-center p-4">
        {children}
      </body>
    </html>
  );
}
