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
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';

const adminNav = [
  { href: '/admin',                label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/admin/establishments', label: 'Estabelecimentos', icon: Building2 },
  { href: '/admin/financial',      label: 'Financeiro',       icon: TrendingUp },
  { href: '/admin/promoters',      label: 'Promotores',       icon: Users },
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

  if (!user) return null;

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <div className="flex-1 px-2 py-4 space-y-0.5">
      {adminNav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            onClick={onClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              active
                ? 'bg-indigo-500/15 text-indigo-400 font-medium'
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
            }`}
          >
            <Icon size={17} />
            {label}
            {active && <ChevronRight size={13} className="ml-auto text-indigo-500" />}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0d0f14]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-60 bg-[#13161e] border-r border-white/6 shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/6">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">AgendaEstilo</p>
          <p className="text-sm font-bold text-white mt-0.5">Painel Admin</p>
        </div>

        <NavLinks />

        {/* User */}
        <div className="px-4 py-4 border-t border-white/6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-200 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-400 transition-colors"
          >
            <LogOut size={15} />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-72 h-full bg-[#13161e] z-50 shadow-2xl border-r border-white/6">
            <button
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={18} />
            </button>
            <div className="px-5 py-5 border-b border-white/6">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">AgendaEstilo</p>
              <p className="text-sm font-bold text-white mt-0.5">Painel Admin</p>
            </div>
            <NavLinks onClick={() => setSidebarOpen(false)} />
            <div className="px-4 py-4 border-t border-white/6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-200 truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-400 transition-colors"
              >
                <LogOut size={15} />
                Sair
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#13161e] border-b border-white/6 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg text-gray-400 hover:bg-white/5">
            <Menu size={20} />
          </button>
          <span className="font-semibold text-gray-200 text-sm">Painel Admin</span>
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
