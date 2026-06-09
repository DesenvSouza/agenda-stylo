import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "AgendaEstilo — Agendamento para Salões e Barbearias",
  description: "Plataforma completa de agendamento online para salões de beleza, barbearias e estéticas.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="bg-[#FAFAF8]">
      <body className={`${inter.variable} antialiased bg-[#FAFAF8] min-h-screen`}>
        <AuthProvider>{children}</AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: { fontFamily: "inherit", borderRadius: "12px", fontSize: "14px" },
            classNames: {
              success: "border-green-200",
              error: "border-red-200",
            },
          }}
        />
      </body>
    </html>
  );
}
