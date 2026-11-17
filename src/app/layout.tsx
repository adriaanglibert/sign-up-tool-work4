import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Branch inschrijving | Arteveldehogeschool",
  description:
    "Kies jouw VZW- en Branch-voorkeuren voor het academiejaar 2026-27.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nl-BE" className={geistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
