import type { Metadata } from "next";
import "@fontsource/geist/400.css";
import "@fontsource/geist/500.css";
import "@fontsource/geist/600.css";
import "@fontsource/geist/700.css";
import "./globals.css";
export const metadata: Metadata = {
  icons: { icon: "/favicon.svg" },
  title: "Relay CRM — A little more forward.",
  description:
    "A thoughtfully built CRM demo for small teams. Relationships, opportunities, and next steps, all in one place. A Wild Logic portfolio project.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
