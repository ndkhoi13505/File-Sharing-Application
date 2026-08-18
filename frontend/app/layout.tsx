import type { Metadata } from "next";
import { Inter } from "next/font/google"; 
import "./globals.css";
import Navbar from "@/components/Navibar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"], 
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "File Sharing - Hệ thống chia sẻ file",
  description: "Nền tảng chia sẻ file an toàn",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-gray-50 text-gray-900">
        <Navbar />
        <main className="flex-grow pt-16">
          {children}
        </main>
      </body>
    </html>
  );
}
