import type { Metadata } from "next";
import { Roboto, Inter } from "next/font/google";
import QueryProvider from "@/providers/QueryProvider";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const roboto = Roboto({
  weight: ['100', '300', '400', '500', '700', '900'],
  subsets: ['latin'],
  variable: '--font-roboto',
});

export const metadata: Metadata = {
  title: "Cinematickrs CRM | Account & Workspace Settings",
  description: "Secure, premium user authentication and profile management system built with Next.js, Supabase, and Framer Motion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html
        lang="en"
        className={cn("h-full", "antialiased", roboto.variable, "font-sans", inter.variable)}
        suppressHydrationWarning
      >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}

