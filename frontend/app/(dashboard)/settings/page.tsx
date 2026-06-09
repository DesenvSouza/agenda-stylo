"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { BookingUrlCard } from "@/components/BookingUrlCard";
import {
  Bell, Building2, ChevronRight, Clock,
  CreditCard, LogOut, Scissors, UserRound, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SettingItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
  accent?: boolean;
};

function SettingRow({ item }: { item: SettingItem }) {
  return (
    <Link href={item.href}>
      <div className="flex items-center justify-between px-4 py-3.5 hover:bg-[#F5F5F5] active:bg-[#F0F0F0] transition-colors cursor-pointer">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
            item.accent ? "bg-[#1B1B1B]" : "bg-[#FAEEDA]"
          )}>
            <item.icon size={18} className={item.accent ? "text-[#EF9F27]" : "text-[#EF9F27]"} />
          </div>
          <div>
            <p className="font-semibold text-[#1B1B1B] text-sm leading-tight">{item.label}</p>
            <p className="text-xs text-[#9B9B9B] mt-0.5">{item.description}</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-[#C4C4C4] shrink-0" />
      </div>
    </Link>
  );
}

function SectionCard({ title, items }: { title: string; items: SettingItem[] }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-widest px-1 mb-2">
        {title}
      </p>
      <div className="bg-white rounded-2xl border border-black/8 overflow-hidden divide-y divide-black/5">
        {items.map((item) => (
          <SettingRow key={item.href} item={item} />
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-[#1B1B1B] mb-5">Configurações</h1>

      {/* URL da página pública */}
      {user?.slug && (
        <div className="mb-5">
          <BookingUrlCard slug={user.slug} />
        </div>
      )}

      {/* Gestão */}
      <SectionCard
        title="Gestão"
        items={[
          {
            href: "/professionals",
            icon: UserRound,
            label: "Profissionais",
            description: "Cadastro, fotos e agenda da equipe",
          },
          {
            href: "/services",
            icon: Scissors,
            label: "Serviços",
            description: "Preços, duração e comissões",
          },
        ]}
      />

      {/* Estabelecimento */}
      <SectionCard
        title="Estabelecimento"
        items={[
          {
            href: "/settings/profile",
            icon: Building2,
            label: "Perfil do Estabelecimento",
            description: "Foto, descrição, endereço e contato",
          },
          {
            href: "/settings/hours",
            icon: Clock,
            label: "Horário de Funcionamento",
            description: "Dias e horários de atendimento",
          },
          {
            href: "/settings/notifications",
            icon: Bell,
            label: "Notificações",
            description: "WhatsApp, e-mail e lembretes",
          },
          {
            href: "/settings/professional-access",
            icon: ShieldCheck,
            label: "Acesso de Profissionais",
            description: "Permita que profissionais acessem o app",
          },
        ]}
      />

      {/* Conta */}
      <SectionCard
        title="Conta"
        items={[
          {
            href: "/settings/plans",
            icon: CreditCard,
            label: "Planos e assinatura",
            description: "Seu plano atual e formas de pagamento",
          },
        ]}
      />

      {/* Info da conta + logout */}
      <div className="bg-white rounded-2xl border border-black/8 px-4 py-4 mb-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-[#9B9B9B]">
          <span>Perfil</span>
          <span className="font-medium text-[#1B1B1B]">{user?.role}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-[#9B9B9B]">
          <span>ID do estabelecimento</span>
          <span className="font-mono text-[10px] text-[#9B9B9B] truncate max-w-[160px]">
            {user?.establishmentId}
          </span>
        </div>
      </div>

      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 h-12 bg-white rounded-2xl border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 active:bg-red-100 transition-colors mb-6"
      >
        <LogOut size={16} />
        Sair da conta
      </button>
    </div>
  );
}
