"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { establishmentsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Building2, Image, MapPin, Phone, Mail, FileText, ChevronLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  { value: 0, label: "Estabelecimento" },
  { value: 1, label: "Barbearia" },
  { value: 2, label: "Salão de Beleza" },
  { value: 3, label: "Esmalteria" },
  { value: 4, label: "Estética" },
  { value: 5, label: "Spa" },
  { value: 6, label: "Outro" },
];

interface Profile {
  name: string;
  category: number;
  phone: string;
  description: string;
  coverImageUrl: string;
  address: string;
  contactEmail: string;
}

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    name: "", category: 0, phone: "", description: "",
    coverImageUrl: "", address: "", contactEmail: "",
  });

  useEffect(() => {
    establishmentsApi.getProfile()
      .then(r => setProfile({
        name:          r.data.name          ?? "",
        category:      r.data.category      ?? 0,
        phone:         r.data.phone         ?? "",
        description:   r.data.description   ?? "",
        coverImageUrl: r.data.coverImageUrl ?? "",
        address:       r.data.address       ?? "",
        contactEmail:  r.data.contactEmail  ?? "",
      }))
      .finally(() => setLoading(false));
  }, []);

  const set = (field: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setProfile(p => ({ ...p, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await establishmentsApi.updateProfile({
        name:          profile.name         || undefined,
        category:      profile.category,
        phone:         profile.phone        || undefined,
        description:   profile.description  || null,
        coverImageUrl: profile.coverImageUrl || null,
        address:       profile.address      || null,
        contactEmail:  profile.contactEmail || null,
      });
      toast.success("Perfil salvo com sucesso!");
    } catch {
      toast.error("Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  };

  const mapsUrl = profile.address
    ? `https://maps.google.com/?q=${encodeURIComponent(profile.address)}`
    : null;

  const publicUrl = user?.slug ? `${window.location.origin}/${user.slug}` : null;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={28} className="animate-spin text-[#EF9F27]" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/settings" className="p-2 rounded-xl hover:bg-[#F5F5F5] transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#1B1B1B]">Perfil do Estabelecimento</h1>
          <p className="text-sm text-[#9B9B9B]">Informações exibidas na sua página pública de agendamento</p>
        </div>
      </div>

      {/* Preview link */}
      {publicUrl && (
        <a
          href={`/${user!.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-3 bg-[#FAEEDA] rounded-2xl text-sm font-medium text-[#EF9F27] hover:bg-[#F5DFB3] transition-colors"
        >
          <ExternalLink size={15} />
          Ver página pública: {publicUrl}
        </a>
      )}

      {/* Foto de capa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Image size={17} className="text-[#EF9F27]" />
            Foto de capa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preview */}
          <div
            className="w-full rounded-2xl overflow-hidden border border-black/8"
            style={{ aspectRatio: "16/6" }}
          >
            {profile.coverImageUrl ? (
              <img
                src={profile.coverImageUrl}
                alt="Capa"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1B1B1B] to-[#3a3a3a] flex items-center justify-center">
                <Building2 size={40} className="text-[#EF9F27] opacity-50" />
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>URL da imagem de capa</Label>
            <Input
              type="url"
              value={profile.coverImageUrl}
              onChange={set("coverImageUrl")}
              placeholder="https://exemplo.com/foto-do-estabelecimento.jpg"
            />
            <p className="text-xs text-[#9B9B9B]">
              Cole a URL de uma imagem hospedada (recomendado: 1200×400px, proporção 3:1)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Informações básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 size={17} className="text-[#EF9F27]" />
            Informações básicas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome do estabelecimento *</Label>
              <Input value={profile.name} onChange={set("name")} placeholder="Ex: Barbearia do João" />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <select
                value={profile.category}
                onChange={set("category")}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <FileText size={13} className="text-[#9B9B9B]" />
              Descrição
            </Label>
            <textarea
              value={profile.description}
              onChange={set("description")}
              placeholder="Conte um pouco sobre o seu estabelecimento, especialidades, diferenciais..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contato */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Phone size={17} className="text-[#EF9F27]" />
            Contato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Phone size={13} className="text-[#9B9B9B]" />
                WhatsApp / Telefone
              </Label>
              <Input
                type="tel"
                value={profile.phone}
                onChange={set("phone")}
                placeholder="(31) 99999-9999"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Mail size={13} className="text-[#9B9B9B]" />
                E-mail de contato
              </Label>
              <Input
                type="email"
                value={profile.contactEmail}
                onChange={set("contactEmail")}
                placeholder="contato@seuestablecimento.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin size={17} className="text-[#EF9F27]" />
            Endereço
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Endereço completo</Label>
            <Input
              value={profile.address}
              onChange={set("address")}
              placeholder="Rua das Flores, 123 – Centro, Belo Horizonte – MG, 30000-000"
            />
            <p className="text-xs text-[#9B9B9B]">
              Informe o endereço completo. Será exibido na página pública com link para o Google Maps.
            </p>
          </div>

          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/10 text-sm font-medium text-[#6B6B6B] hover:border-[#EF9F27] hover:text-[#EF9F27] transition-colors"
            >
              <MapPin size={15} />
              Ver no Google Maps
              <ExternalLink size={13} />
            </a>
          )}
        </CardContent>
      </Card>

      <Button variant="accent" onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        {saving && <Loader2 size={14} className="animate-spin mr-1" />}
        {saving ? "Salvando..." : "Salvar perfil"}
      </Button>
    </div>
  );
}
