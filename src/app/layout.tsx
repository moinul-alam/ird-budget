import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const kalpurush = localFont({
  src: "../../public/fonts/kalpurush.ttf",
  variable: "--font-kalpurush",
  display: "swap",
});

export const metadata: Metadata = {
  title: "আইআরডি বাজেট ব্যবস্থাপনা",
  description: "অভ্যন্তরীণ সম্পদ বিভাগের বাজেট ব্যবস্থাপনা সিস্টেম",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bn"
      className={`${kalpurush.variable} h-full antialiased font-sans`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 font-kalpurush">{children}</body>
    </html>
  );
}
