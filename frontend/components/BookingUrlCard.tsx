"use client";

import { useState } from "react";
import { Copy, Check, Link, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  slug: string;
}

export function BookingUrlCard({ slug }: Props) {
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? "https://agendaestilo.com.br";

  const url = `${baseUrl}/${slug}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!slug) return null;

  return (
    <Card className="border-[#EF9F27]/30 bg-[#FAEEDA]/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-[#1B1B1B]">
          <Link size={16} className="text-[#EF9F27]" />
          Link de agendamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-[#6B6B6B]">
          Compartilhe este link com seus clientes para que eles possam agendar online:
        </p>

        <div className="flex items-center gap-2 bg-white rounded-xl border border-[#EF9F27]/40 px-3 py-2.5">
          <span className="flex-1 text-sm font-mono text-[#1B1B1B] truncate">{url}</span>
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-[#F5F5F5] text-[#6B6B6B] hover:text-[#1B1B1B] transition-colors"
              title="Abrir link"
            >
              <ExternalLink size={15} />
            </a>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EF9F27] text-white text-xs font-semibold hover:bg-[#d98e22] transition-colors"
            >
              {copied ? (
                <>
                  <Check size={13} strokeWidth={3} />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy size={13} />
                  Copiar
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-xs text-[#9B9B9B]">
          Envie via WhatsApp, Instagram ou cole na bio do seu perfil.
        </p>
      </CardContent>
    </Card>
  );
}
