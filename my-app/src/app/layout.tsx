import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "小说写作助手",
  description: "AI 辅助小说创作工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
