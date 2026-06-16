"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart2, Calendar, ChevronLeft, ChevronRight, CreditCard, Home, LogOut, Settings, Scissors, Users, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Início" },
  { href: "/bookings", icon: Calendar, label: "Agenda" },
  { href: "/professionals", icon: UserRound, label: "Profissionais" },
  { href: "/services", icon: Scissors, label: "Serviços" },
  { href: "/clients", icon: Users, label: "Clientes" },
  { href: "/reports", icon: BarChart2, label: "Relatórios" },
  { href: "/settings", icon: Settings, label: "Configurações" },
  { href: "/settings/plans", icon: CreditCard, label: "Planos" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen bg-[#1B1B1B] text-white transition-all duration-300 sticky top-0",
        collapsed ? "w-[72px]" : "w-[240px]"
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
        {!collapsed && (
          <span className="font-bold text-lg text-[#EF9F27] tracking-tight">AgendaEstilo</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-md hover:bg-white/10 transition-colors ml-auto"
          aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                isActive
                  ? "bg-[#EF9F27] text-[#1B1B1B] font-semibold"
                  : "hover:bg-white/10 text-white/80 hover:text-white"
              )}
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-white/10">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
        >
          <LogOut size={20} className="shrink-0" />
          {!collapsed && <span className="text-sm">Sair</span>}
        </button>
      </div>
    </aside>
  );
}
