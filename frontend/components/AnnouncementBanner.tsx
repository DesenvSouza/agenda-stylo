"use client";

import { useEffect, useState } from "react";
import { X, Info, AlertTriangle, AlertCircle, Sparkles, ExternalLink } from "lucide-react";
import { AnnouncementDto, announcementsApi } from "@/lib/api";

// ── Mapa de estilos por severidade ──────────────────────────────────────────
const SEVERITY_STYLES: Record<
  AnnouncementDto["severity"],
  { bg: string; border: string; icon: React.ElementType; iconColor: string; textColor: string }
> = {
  Novidade: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: Sparkles,
    iconColor: "text-emerald-600",
    textColor: "text-emerald-900",
  },
  Info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: Info,
    iconColor: "text-blue-600",
    textColor: "text-blue-900",
  },
  Aviso: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
    textColor: "text-amber-900",
  },
  Urgente: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: AlertCircle,
    iconColor: "text-red-600",
    textColor: "text-red-900",
  },
};

const DISMISS_KEY = (id: string) => `announcement_dismissed_${id}`;

function isBrowserDismissed(id: string): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(DISMISS_KEY(id));
}

// ── Banner individual ────────────────────────────────────────────────────────
function AnnouncementItem({ item }: { item: AnnouncementDto }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(isBrowserDismissed(item.id));
  }, [item.id]);

  if (dismissed) return null;

  const style = SEVERITY_STYLES[item.severity] ?? SEVERITY_STYLES.Info;
  const Icon = style.icon;

  const handleDismiss = () => {
    if (item.isDismissible) {
      localStorage.setItem(DISMISS_KEY(item.id), "1");
      setDismissed(true);
    }
  };

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${style.bg} ${style.border}`}
      role="alert"
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.iconColor}`} />

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${style.textColor}`}>{item.title}</p>
        <p className={`mt-0.5 text-sm ${style.textColor} opacity-90`}>{item.body}</p>

        {item.actionLabel && item.actionUrl && (
          <a
            href={item.actionUrl}
            target={item.actionUrl.startsWith("http") ? "_blank" : "_self"}
            rel="noopener noreferrer"
            className={`mt-2 inline-flex items-center gap-1 text-sm font-medium underline underline-offset-2 ${style.iconColor}`}
          >
            {item.actionLabel}
            {item.actionUrl.startsWith("http") && (
              <ExternalLink className="h-3 w-3" />
            )}
          </a>
        )}
      </div>

      {item.isDismissible && (
        <button
          onClick={handleDismiss}
          aria-label="Fechar aviso"
          className={`shrink-0 rounded p-0.5 transition-colors ${style.iconColor} hover:bg-black/10`}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<AnnouncementDto[]>([]);

  useEffect(() => {
    announcementsApi
      .getActive()
      .then((r) => setAnnouncements(r.data))
      .catch(() => {
        /* silently ignore — banners are optional */
      });
  }, []);

  if (announcements.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {announcements.map((a) => (
        <AnnouncementItem key={a.id} item={a} />
      ))}
    </div>
  );
}
