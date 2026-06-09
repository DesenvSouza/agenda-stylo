"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff, Loader2, Users } from "lucide-react";
import { establishmentsApi } from "@/lib/api";
import { toast } from "sonner";

export default function ProfessionalAccessPage() {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    establishmentsApi.getProfessionalAccess()
      .then((res) => setAllowed(res.data.allowed))
      .catch(() => toast.error("Erro ao carregar configuração"))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle() {
    setSaving(true);
    try {
      const res = await establishmentsApi.setProfessionalAccess(!allowed);
      setAllowed(res.data.allowed);
      toast.success(res.data.allowed
        ? "Acesso de profissionais ativado"
        : "Acesso de profissionais desativado"
      );
    } catch {
      toast.error("Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-[#1B1B1B] mb-1">Acesso de Profissionais</h1>
      <p className="text-sm text-[#9B9B9B] mb-6">
        Configure se os profissionais podem acessar o aplicativo para gerenciar seus próprios agendamentos e perfil.
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[#EF9F27]" />
        </div>
      ) : (
        <>
          {/* Toggle card */}
          <div className="bg-white rounded-2xl border border-black/8 p-5 mb-4">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${allowed ? "bg-green-100" : "bg-[#F5F5F5]"}`}>
                {allowed
                  ? <ShieldCheck size={22} className="text-green-600" />
                  : <ShieldOff size={22} className="text-[#9B9B9B]" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1B1B1B]">
                  {allowed ? "Acesso habilitado" : "Acesso desabilitado"}
                </p>
                <p className="text-sm text-[#9B9B9B] mt-0.5">
                  {allowed
                    ? "Profissionais com credenciais ativas podem acessar o portal."
                    : "Nenhum profissional tem acesso ao portal do sistema."}
                </p>
                <button
                  onClick={handleToggle}
                  disabled={saving}
                  className={`mt-3 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 ${
                    allowed
                      ? "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
                      : "bg-green-50 border border-green-200 text-green-700 hover:bg-green-100"
                  }`}
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {allowed ? "Desabilitar acesso" : "Habilitar acesso"}
                </button>
              </div>
            </div>
          </div>

          {/* Info cards */}
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-black/8 p-4">
              <div className="flex items-start gap-3">
                <Users size={18} className="text-[#EF9F27] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#1B1B1B] mb-1">O que o profissional pode fazer?</p>
                  <ul className="text-sm text-[#6B6B6B] space-y-1">
                    <li>• Ver e acompanhar seus próprios agendamentos</li>
                    <li>• Editar seu perfil (nome, bio, especialidade)</li>
                    <li>• Configurar sua agenda semanal</li>
                    <li>• Ver seu relatório pessoal de atendimentos</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-black/8 p-4">
              <div className="flex items-start gap-3">
                <ShieldOff size={18} className="text-[#9B9B9B] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#1B1B1B] mb-1">O que o profissional NÃO pode fazer?</p>
                  <ul className="text-sm text-[#6B6B6B] space-y-1">
                    <li>• Ver relatórios gerais do estabelecimento</li>
                    <li>• Acessar dados de outros profissionais</li>
                    <li>• Alterar serviços ou preços</li>
                    <li>• Acessar dados de clientes em geral</li>
                  </ul>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#9B9B9B] px-1">
              Para ativar o acesso de um profissional específico, vá em{" "}
              <strong className="text-[#1B1B1B]">Profissionais</strong> e clique em &quot;Ativar acesso&quot; no painel do profissional.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
