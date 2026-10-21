import type { Metadata } from "next";
import { Noto_Sans_Bengali, Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// Premium modern Bengali typography with variable weights
const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-noto-bengali",
  display: "swap",
});

// Crisp English/Latin UI typography
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

// Sharp tabular numerical typography
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

// Fallback legacy local Kalpurush font
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
      className={`${notoSansBengali.variable} ${inter.variable} ${jetbrainsMono.variable} ${kalpurush.variable} h-full antialiased font-sans`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 font-sans text-slate-800 antialiased selection:bg-emerald-500/20 selection:text-emerald-900">
        {children}
      </body>
    </html>
  );
}
