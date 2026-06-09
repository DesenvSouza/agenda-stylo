'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, ADMIN_STORAGE } from '@/lib/admin-api';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

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

  if (done) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center">
          <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900">Senha definida com sucesso!</h2>
          <p className="text-sm text-gray-500">Redirecionando para o painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Lock size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Definir senha de acesso</h2>
              <p className="text-sm text-gray-500">Crie uma senha segura para sua conta</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  required
                  minLength={8}
                  className="w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Mínimo 8 caracteres"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Repita a senha"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-medium transition disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
