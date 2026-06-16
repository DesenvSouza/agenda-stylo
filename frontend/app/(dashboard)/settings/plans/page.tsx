"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Zap, Crown, Users, Scissors, AlertCircle } from "lucide-react";
import { billingApi, PlanStatusDto } from "@/lib/api";
import { cn } from "@/lib/utils";

const UNLIMITED = 2147483647; // int.MaxValue

function UsageBar({
  label,
  used,
  limit,
  icon: Icon,
}: {
  label: string;
  used: number;
  limit: number;
  icon: React.ElementType;
}) {
  const unlimited = limit >= UNLIMITED;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const danger = !unlimited && pct >= 80;
  const warn   = !unlimited && pct >= 60 && pct < 80;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-[#555]">
          <Icon size={13} />
          <span>{label}</span>
        </div>
        <span className={cn("font-medium", danger ? "text-rose-500" : "text-[#1B1B1B]")}>
          {used}{!unlimited && ` / ${limit}`}
          {unlimited && <span className="text-[#9B9B9B] font-normal"> (ilimitado)</span>}
        </span>
      </div>
      {!unlimited && (
        <div className="h-1.5 rounded-full bg-[#F0F0F0] overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              danger ? "bg-rose-500" : warn ? "bg-amber-400" : "bg-indigo-500"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface PlanCardProps {
  plan: PlanStatusDto["availablePlans"][0];
  isCurrent: boolean;
}

function PlanCard({ plan, isCurrent }: PlanCardProps) {
  const isProfissional = plan.id === "Profissional";

  const features = isProfissional
    ? [
        "Profissionais ilimitados",
        "Serviços ilimitados",
        "Link de agendamento online",
        "Agendamentos ilimitados",
        "Notificações por WhatsApp",
        "Relatórios completos",
        "Gestão de clientes",
      ]
    : [
        `Até ${plan.professionalsLimit} profissionais`,
        `Até ${plan.servicesLimit} serviços`,
        "Link de agendamento online",
        "Agendamentos ilimitados",
        "Notificações por WhatsApp",
        "Relatórios completos",
        "Gestão de clientes",
      ];

  return (
    <div
      className={cn(
        "relative rounded-2xl border-2 p-6 flex flex-col transition-all",
        isCurrent
          ? isProfissional
            ? "border-indigo-500 bg-indigo-50/40 shadow-lg shadow-indigo-100"
            : "border-[#EF9F27] bg-amber-50/40 shadow-lg shadow-amber-50"
          : "border-black/[0.07] bg-white hover:border-black/[0.13] hover:shadow-md"
      )}
    >
      {/* Badge atual */}
      {isCurrent && (
        <div
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap",
            isProfissional ? "bg-indigo-500" : "bg-[#EF9F27]"
          )}
        >
          Plano atual
        </div>
      )}

      {/* Ícone + Nome */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            isProfissional ? "bg-indigo-100" : "bg-amber-100"
          )}
        >
          {isProfissional ? (
            <Crown size={18} className="text-indigo-600" />
          ) : (
            <Zap size={18} className="text-amber-500" />
          )}
        </div>
        <div>
          <p className="font-bold text-[#1B1B1B] text-base">{plan.label}</p>
          <p className="text-xs text-[#9B9B9B]">
            {isProfissional ? "Para salões em crescimento" : "Para profissionais autônomos"}
          </p>
        </div>
      </div>

      {/* Preço */}
      <div className="flex items-end gap-1 mb-5">
        <span className="text-4xl font-black text-[#1B1B1B]">
          R${plan.price.toFixed(2).replace(".", ",")}
        </span>
        <span className="text-sm text-[#9B9B9B] mb-1.5">/mês</span>
      </div>

      {/* Features */}
      <ul className="space-y-2.5 flex-1 mb-6">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <div
              className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                isProfissional ? "bg-indigo-500" : "bg-[#EF9F27]"
              )}
            >
              <Check size={10} className="text-white" strokeWidth={3} />
            </div>
            <span className="text-sm text-[#6B6B6B]">{f}</span>
          </li>
        ))}
      </ul>

      {/* Botão */}
      {isCurrent ? (
        <div
          className={cn(
            "w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2",
            isProfissional
              ? "bg-indigo-100 text-indigo-700"
              : "bg-amber-100 text-amber-700"
          )}
        >
          <Check size={15} strokeWidth={2.5} />
          Plano ativo
        </div>
      ) : (
        <button
          disabled
          className="w-full h-11 rounded-xl text-sm font-semibold bg-[#F5F5F5] text-[#9B9B9B] cursor-not-allowed"
        >
          Em breve — Assinar
        </button>
      )}
    </div>
  );
}

export default function PlansPage() {
  const [status, setStatus] = useState<PlanStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    billingApi
      .getStatus()
      .then((r) => setStatus(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-[#9B9B9B] text-sm">
        <AlertCircle size={16} />
        Não foi possível carregar o status do plano.
      </div>
    );
  }

  const hasActivePlan = status.isActive && status.currentPlan !== null;
  const nearLimit =
    hasActivePlan &&
    (
      (status.professionalsLimit < UNLIMITED && status.professionalsUsed >= status.professionalsLimit - 1) ||
      (status.servicesLimit < UNLIMITED && status.servicesUsed >= status.servicesLimit - 1)
    );

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#1B1B1B]">Plano e uso</h1>
        <p className="text-sm text-[#9B9B9B] mt-0.5">Gerencie sua assinatura e acompanhe o uso da conta.</p>
      </div>

      {/* Status banner quando não tem plano ativo */}
      {!hasActivePlan && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="font-semibold">Nenhum plano ativo</p>
            <p className="text-amber-700 mt-0.5 text-xs">
              Entre em contato com o suporte para ativar seu plano.
            </p>
          </div>
        </div>
      )}

      {/* Aviso de limite próximo */}
      {nearLimit && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-800">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
          <div>
            <p className="font-semibold">Próximo do limite do plano</p>
            <p className="text-rose-700 mt-0.5 text-xs">
              Você está chegando ao limite de profissionais ou serviços. Considere fazer upgrade.
            </p>
          </div>
        </div>
      )}

      {/* Uso atual */}
      {hasActivePlan && (
        <div className="bg-white rounded-2xl border border-black/[0.07] p-5 space-y-4">
          <p className="text-sm font-semibold text-[#1B1B1B]">Uso atual</p>
          <UsageBar
            label="Profissionais"
            used={status.professionalsUsed}
            limit={status.professionalsLimit}
            icon={Users}
          />
          <UsageBar
            label="Serviços"
            used={status.servicesUsed}
            limit={status.servicesLimit}
            icon={Scissors}
          />
        </div>
      )}

      {/* Cards de planos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {status.availablePlans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} isCurrent={plan.isCurrent} />
        ))}
      </div>

      {/* Rodapé */}
      <p className="text-center text-xs text-[#C4C4C4] pb-2">
        Cobranças em BRL. Para alterar seu plano, entre em contato com o suporte.
      </p>
    </div>
  );
}
