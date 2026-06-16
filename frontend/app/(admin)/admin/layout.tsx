'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ADMIN_STORAGE, AdminUser } from '@/lib/admin-api';
import {
  LayoutDashboard,
  Building2,
  TrendingUp,
  Users,
  Megaphone,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';

const adminNav = [
  { href: '/admin',                  label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/admin/establishments',   label: 'Estabelecimentos', icon: Building2 },
  { href: '/admin/financial',        label: 'Financeiro',       icon: TrendingUp },
  { href: '/admin/promoters',        label: 'Promotores',       icon: Users },
  { href: '/admin/announcements',    label: 'Comunicados',      icon: Megaphone },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser]               = useState<AdminUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(ADMIN_STORAGE.TOKEN);
    const raw   = localStorage.getItem(ADMIN_STORAGE.USER);
    if (!token || !raw) { router.replace('/admin-login'); return; }
    const u = JSON.parse(raw) as AdminUser;
    if (u.role !== 'Admin') { router.replace('/promoter'); return; }
    setUser(u);
  }, [router]);

  function logout() {
    Object.values(ADMIN_STORAGE).forEach((k) => localStorage.removeItem(k));
    router.replace('/admin-login');
  }

  if (!user) return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
      <p className="text-[#555] text-sm">Carregando...</p>
    </div>
  );

  const SidebarContent = ({ onNav }: { onNav?: () => void }) => (
    <>
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <p className="text-white font-bold text-lg tracking-tight">AgendaEstilo</p>
        <p className="text-[#555] text-[11px] mt-0.5">Admin Panel</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
        {adminNav.map(({ href, label, icon: Icon }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNav}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-500/[0.12] text-indigo-400'
                  : 'text-[#888] hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Icon size={16} className="shrink-0" />
              {label}
              {active && <ChevronRight size={12} className="ml-auto text-indigo-500/60" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-4 border-t border-white/[0.06] pt-4">
        <div className="px-3 py-2 mb-2">
          <p className="text-[11px] text-[#888] truncate font-medium">{user.name}</p>
          <p className="text-[10px] text-[#555]">Administrador</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#888] hover:text-red-400 hover:bg-red-500/[0.08] transition-colors"
        >
          <LogOut size={15} />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#111]">
      {/* Desktop sidebar — fixed */}
      <aside className="fixed inset-y-0 left-0 w-56 bg-[#161616] border-r border-white/[0.06] flex flex-col z-30 hidden lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative flex flex-col w-60 h-full bg-[#161616] border-r border-white/[0.06] z-50 shadow-2xl">
            <button
              className="absolute top-4 right-4 text-[#555] hover:text-white transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={18} />
            </button>
            <SidebarContent onNav={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main — offset by sidebar on desktop */}
      <div className="lg:pl-56 min-h-screen flex flex-col">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#161616] border-b border-white/[0.06] sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="text-[#888] hover:text-white transition-colors">
            <Menu size={20} />
          </button>
          <span className="font-semibold text-white text-sm">Painel Admin</span>
          <div className="w-7 h-7 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-xs font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </header>

        <main className="flex-1">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
