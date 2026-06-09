"use client";

import { useEffect, useState } from "react";
import { Camera, Loader2, Save } from "lucide-react";
import { professionalPortalApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Profile {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  photoUrl?: string;
  whatsapp?: string;
  cpf?: string;
}

function Avatar({ name, photoUrl, size = 80 }: { name: string; photoUrl?: string; size?: number }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size / 3 }}
      className="rounded-full bg-[#FAEEDA] flex items-center justify-center font-bold text-[#EF9F27]"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function ProfessionalProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", specialty: "", bio: "" });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    professionalPortalApi.getMe()
      .then((res) => {
        const d = res.data as Profile;
        setProfile(d);
        setForm({ name: d.name, specialty: d.specialty ?? "", bio: d.bio ?? "" });
      })
      .catch(() => toast.error("Erro ao carregar perfil"))
      .finally(() => setLoading(false));
  }, []);

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("O nome é obrigatório"); return; }
    setSaving(true);
    try {
      await professionalPortalApi.updateMe(form);
      setProfile((prev) => prev ? { ...prev, ...form } : prev);
      setDirty(false);
      toast.success("Perfil atualizado com sucesso!");
    } catch {
      toast.error("Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={24} className="animate-spin text-[#EF9F27]" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-[#1B1B1B] mb-5">Meu Perfil</h1>

      {/* Avatar */}
      <div className="bg-white rounded-2xl border border-black/8 p-5 mb-4">
        <div className="flex items-center gap-4">
          <Avatar name={profile.name} photoUrl={profile.photoUrl} size={72} />
          <div>
            <p className="font-bold text-[#1B1B1B]">{profile.name}</p>
            {profile.specialty && (
              <p className="text-sm text-[#9B9B9B]">{profile.specialty}</p>
            )}
            <p className="text-xs text-[#C4C4C4] mt-1 flex items-center gap-1">
              <Camera size={11} />
              Foto gerenciada pelo estabelecimento
            </p>
          </div>
        </div>
      </div>

      {/* Formulário de edição */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-black/8 p-5 space-y-4">
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Seu nome completo"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label>Especialidade</Label>
          <Input
            value={form.specialty}
            onChange={(e) => handleChange("specialty", e.target.value)}
            placeholder="Ex: Corte masculino, coloração..."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Bio</Label>
          <textarea
            value={form.bio}
            onChange={(e) => handleChange("bio", e.target.value)}
            placeholder="Conte um pouco sobre você, sua experiência e diferenciais..."
            rows={4}
            className="w-full px-3 py-2.5 rounded-xl border border-black/15 text-sm text-[#1B1B1B] placeholder:text-[#C4C4C4] resize-none focus:outline-none focus:border-[#1B1B1B] transition-colors"
          />
        </div>

        <Button type="submit" variant="accent" disabled={saving || !dirty} className="w-full gap-2">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </form>

      {/* Dados somente leitura */}
      {(profile.whatsapp || profile.cpf) && (
        <div className="bg-white rounded-2xl border border-black/8 p-5 mt-4 space-y-3">
          <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-widest">Dados cadastrais</p>
          {profile.whatsapp && (
            <div>
              <p className="text-xs text-[#9B9B9B]">WhatsApp</p>
              <p className="text-sm font-semibold text-[#1B1B1B]">{profile.whatsapp}</p>
            </div>
          )}
          {profile.cpf && (
            <div>
              <p className="text-xs text-[#9B9B9B]">CPF</p>
              <p className="text-sm font-semibold text-[#1B1B1B]">{profile.cpf}</p>
            </div>
          )}
          <p className="text-xs text-[#C4C4C4]">Esses dados são gerenciados pelo estabelecimento.</p>
        </div>
      )}
    </div>
  );
}
