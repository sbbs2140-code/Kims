import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { MotionProvider } from "@/components/motion-provider";
import "./globals.css";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

export const metadata: Metadata = {
  title: "온빛중학교 웹 앱 모음",
  description: "수업, 생활지도, 행정에 쓰는 학교 웹 앱을 한곳에서 찾고 엽니다.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBFBF9" },
    { media: "(prefers-color-scheme: dark)", color: "#141414" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} antialiased`}>
      <body className="min-h-dvh font-sans">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
