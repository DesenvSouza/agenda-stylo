'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, ADMIN_STORAGE } from '@/lib/admin-api';
import { Lock, Eye, EyeOff, Check } from 'lucide-react';

export default function AdminChangePasswordPage() {
  const router = useRouter();
  const [pwd, setPwd]         = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (pwd.length < 8) { setError('A senha deve ter ao menos 8 caracteres.'); return; }
    if (pwd !== confirm) { setError('As senhas não coincidem.'); return; }

    setLoading(true);
    try {
      await adminApi.setInitialPassword(pwd);
      localStorage.setItem(ADMIN_STORAGE.MUST_CHANGE_PWD, 'false');
      const raw = localStorage.getItem(ADMIN_STORAGE.USER);
      if (raw) {
        const u = JSON.parse(raw);
        u.mustChangePassword = false;
        localStorage.setItem(ADMIN_STORAGE.USER, JSON.stringify(u));
      }
      setDone(true);
      setTimeout(() => router.replace('/admin'), 1500);
    } catch {
      setError('Erro ao trocar a senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-indigo-500/50 transition-colors';

  if (done) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Senha definida com sucesso!</h2>
          <p className="text-sm text-[#666] mt-1">Redirecionando para o painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md">
        <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Lock size={19} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Definir senha de acesso</h2>
              <p className="text-xs text-[#666]">Crie uma senha segura para sua conta</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#AAA] mb-1.5">Nova senha</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  required minLength={8}
                  className={`${inputClass} pr-10`}
                  placeholder="Mínimo 8 caracteres"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#888] transition-colors">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#AAA] mb-1.5">Confirmar senha</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className={inputClass}
                placeholder="Repita a senha"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Salvando...' : 'Salvar senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
