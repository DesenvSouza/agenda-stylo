'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ADMIN_STORAGE, AdminUser } from '@/lib/admin-api';
import { LayoutDashboard, LogOut, Menu, X, ChevronRight } from 'lucide-react';

const promoterNav = [
  { href: '/promoter', label: 'Dashboard', icon: LayoutDashboard },
];

export default function PromoterLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser]             = useState<AdminUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(ADMIN_STORAGE.TOKEN);
    const raw   = localStorage.getItem(ADMIN_STORAGE.USER);
    if (!token || !raw) { router.replace('/admin-login'); return; }
    const u = JSON.parse(raw) as AdminUser;
    if (u.role !== 'Admin' && u.role !== 'Promoter') { router.replace('/admin-login'); return; }
    if (u.role === 'Admin') { router.replace('/admin'); return; }
    setUser(u);
  }, [router]);

  function logout() {
    Object.values(ADMIN_STORAGE).forEach((k) => localStorage.removeItem(k));
    router.replace('/admin-login');
  }

  if (!user) return null;

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={mobile ? 'flex flex-col h-full' : ''}>
      <div className="px-4 py-5 border-b">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">AgendaEstilo</p>
        <p className="text-sm font-semibold text-gray-900 mt-0.5">Portal do Promotor</p>
      </div>

      <div className="flex-1 px-2 py-4 space-y-1">
        {promoterNav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                active
                  ? 'bg-orange-50 text-orange-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={18} />
              {label}
              {active && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          );
        })}
      </div>

      {/* Código de indicação */}
      {user.promoterCode && (
        <div className="px-4 py-3 mx-2 mb-2 bg-orange-50 rounded-xl">
          <p className="text-xs text-orange-600 font-medium mb-1">Seu código de indicação</p>
          <p className="text-lg font-bold text-orange-700 font-mono">{user.promoterCode}</p>
          <p className="text-xs text-orange-500 mt-0.5">Compartilhe para ganhar comissões</p>
        </div>
      )}

      <div className="px-4 py-4 border-t">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-semibold text-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-72 h-full bg-white z-50 shadow-xl">
            <button className="absolute top-4 right-4 p-1 rounded text-gray-500" onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
            <Sidebar mobile />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-1 rounded text-gray-600">
            <Menu size={22} />
          </button>
          <span className="font-semibold text-gray-800 text-sm">Portal do Promotor</span>
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-semibold text-sm">
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
