import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chronova AI — Your AI Academic Life OS",
  description:
    "AI-powered academic scheduling for students and institutions. Generate personalized study plans, manage timetables, and boost productivity with your intelligent academic mentor.",
  keywords: [
    "AI scheduler",
    "study planner",
    "academic AI",
    "timetable generator",
    "student productivity",
    "Chronova AI",
  ],
  authors: [{ name: "Chronova AI" }],
  openGraph: {
    title: "Chronova AI — Your AI Academic Life OS",
    description: "AI-powered academic scheduling for students and institutions.",
    type: "website",
  },
};

import { ThemeProvider } from "@/components/providers/ThemeProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} page-bg page-content`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
