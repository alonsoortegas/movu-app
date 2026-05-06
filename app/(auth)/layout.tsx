import "../globals.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-[#111] antialiased min-h-screen flex items-center justify-center p-4">
        {children}
      </body>
    </html>
  );
}
