import type { Metadata } from "next";
import "./globals.css";
import { themeInitScript } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Kargo Hiring Dashboard",
  description: "Internal PM/SPM hiring dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Applied before paint so switching themes never flashes the wrong one on load. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
