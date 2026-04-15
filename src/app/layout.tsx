import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "英文字母小學堂 | 幼兒英文字母學習",
  description: "專為幼兒設計的英文字母學習平台，透過練習與挑戰掌握 A-Z。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased">{children}</body>
    </html>
  );
}
