"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/lib/auth-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
    if (!isLoading && user?.role === "Profissional") {
      router.replace("/professional");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
        <div className="w-8 h-8 border-4 border-[#EF9F27] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#FAFAF8]">
      <Sidebar />
      <main className="flex-1 min-w-0 bg-[#FAFAF8] pb-20 lg:pb-8">
        <div className="max-w-7xl mx-auto px-4 py-6 lg:px-8">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
