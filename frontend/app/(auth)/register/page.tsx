"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CATEGORIES = [
  { value: 1, label: "Barbearia" },
  { value: 2, label: "Salão de Beleza" },
  { value: 3, label: "Esmalteria" },
  { value: 4, label: "Estética" },
  { value: 5, label: "Spa" },
  { value: 6, label: "Outro" },
];

export default function RegisterPage() {
  const [form, setForm] = useState({
    establishmentName: "",
    slug: "",
    category: 1,
    phone: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === "category" ? Number(value) : value }));
  };

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setForm((prev) => ({ ...prev, establishmentName: name, slug: generateSlug(name) }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.register(form);
      router.replace("/login");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1B1B1B]">AgendaEstilo</h1>
          <p className="text-[#6B6B6B] mt-1 text-sm">Crie sua conta gratuitamente</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Criar conta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="establishmentName">Nome do estabelecimento</Label>
                <Input
                  id="establishmentName"
                  name="establishmentName"
                  value={form.establishmentName}
                  onChange={handleNameChange}
                  placeholder="Ex: Barbearia do João"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slug">Link personalizado</Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-[#6B6B6B] shrink-0">agendaestilo.com/</span>
                  <Input
                    id="slug"
                    name="slug"
                    value={form.slug}
                    onChange={handleChange}
                    placeholder="meu-salao"
                    pattern="^[a-z0-9-]+$"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">Categoria</Label>
                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="flex h-11 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="(11) 99999-9999" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange} placeholder="seu@email.com" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={handleChange} placeholder="Mínimo 8 caracteres" minLength={8} required />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Criando conta..." : "Criar conta"}
              </Button>
            </form>
            <p className="text-center text-sm text-[#6B6B6B] mt-4">
              Já tem conta?{" "}
              <Link href="/login" className="text-[#EF9F27] hover:underline font-medium">
                Entrar
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
