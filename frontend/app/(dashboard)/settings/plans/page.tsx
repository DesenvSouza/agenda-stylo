"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

const plans: Plan[] = [
  {
    id: "basic",
    name: "Básico",
    price: 79,
    period: "mês",
    description: "Ideal para profissionais autônomos",
    features: [
      "1 profissional",
      "100 agendamentos/mês",
      "Link de agendamento online",
      "Notificações por WhatsApp",
      "Dashboard básico",
    ],
  },
  {
    id: "professional",
    name: "Profissional",
    price: 149,
    period: "mês",
    description: "Para salões em crescimento",
    features: [
      "Até 5 profissionais",
      "Agendamentos ilimitados",
      "Link de agendamento online",
      "Notificações por WhatsApp",
      "Relatórios avançados",
      "Gestão de clientes",
    ],
    highlighted: true,
    badge: "Mais popular",
  },
  {
    id: "studio",
    name: "Estúdio",
    price: 299,
    period: "mês",
    description: "Para grandes estabelecimentos",
    features: [
      "Profissionais ilimitados",
      "Agendamentos ilimitados",
      "Link de agendamento online",
      "Notificações por WhatsApp + E-mail",
      "Relatórios avançados completos",
      "Gestão de clientes premium",
      "Suporte prioritário",
      "API personalizada",
    ],
  },
];

export default function PlansPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold text-[#1B1B1B]">Escolha seu plano</h1>
        <p className="text-sm text-[#9B9B9B] mt-1">
          Todos os planos incluem 14 dias grátis. Cancele quando quiser.
        </p>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map(plan => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>

      {/* Fine print */}
      <p className="text-center text-xs text-[#C4C4C4] pb-4">
        Cobranças em BRL. Integração com Stripe em breve.
        Preços sujeitos a alteração com aviso prévio de 30 dias.
      </p>
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={cn(
        "relative bg-white rounded-2xl border-2 p-6 flex flex-col",
        plan.highlighted
          ? "border-[#EF9F27] shadow-[0_0_0_4px_rgba(239,159,39,0.08)]"
          : "border-black/8"
      )}
    >
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 bg-[#EF9F27] text-white text-xs font-bold rounded-full whitespace-nowrap">
            {plan.badge}
          </span>
        </div>
      )}

      <div className="mb-5">
        <p className="font-bold text-lg text-[#1B1B1B]">{plan.name}</p>
        <p className="text-sm text-[#9B9B9B] mt-0.5">{plan.description}</p>
        <div className="flex items-end gap-1 mt-4">
          <span className="text-3xl font-black text-[#1B1B1B]">R${plan.price}</span>
          <span className="text-sm text-[#9B9B9B] mb-1">/{plan.period}</span>
        </div>
      </div>

      <ul className="space-y-2.5 flex-1 mb-6">
        {plan.features.map(feature => (
          <li key={feature} className="flex items-start gap-2.5">
            <div className={cn(
              "w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5",
              plan.highlighted ? "bg-[#EF9F27]" : "bg-[#1B1B1B]"
            )}>
              <Check size={10} className="text-white" strokeWidth={3} />
            </div>
            <span className="text-sm text-[#6B6B6B]">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        disabled
        className={cn(
          "w-full h-11 rounded-xl text-sm font-semibold transition-all",
          plan.highlighted
            ? "bg-[#EF9F27] text-white opacity-60 cursor-not-allowed"
            : "bg-[#F5F5F5] text-[#9B9B9B] cursor-not-allowed"
        )}
      >
        Em breve — Assinar
      </button>
    </div>
  );
}
