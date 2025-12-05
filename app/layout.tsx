import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "電話帳プラス",
  description: "電話対応状況をフレンドと共有し、連絡先を管理しやすくするアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

