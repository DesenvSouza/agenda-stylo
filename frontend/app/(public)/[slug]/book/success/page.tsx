import Link from "next/link";
import { CheckCircle, Calendar, Clock, User, MapPin, Scissors, Tag } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function buildGoogleCalendarUrl(params: {
  title: string; date: string; duration: number; description: string; location?: string;
}) {
  const start = parseISO(params.date);
  const end = new Date(start.getTime() + params.duration * 60000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: params.description,
    location: params.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export default function SuccessPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: {
    service?: string; professional?: string; scheduledAt?: string;
    duration?: string; price?: string; cancelToken?: string;
    confirmationCode?: string; address?: string;
  };
}) {
  const service = searchParams.service ?? "Serviço";
  const professional = searchParams.professional ?? "Profissional";
  const scheduledAt = searchParams.scheduledAt;
  const durationNum = parseInt(searchParams.duration ?? "0", 10);
  const price = searchParams.price ?? "0";
  const confirmationCode = searchParams.confirmationCode;
  const address = searchParams.address;

  const date = scheduledAt ? parseISO(scheduledAt) : null;

  const googleCalUrl = date
    ? buildGoogleCalendarUrl({
        title: `${service} — ${professional}`,
        date: scheduledAt!,
        duration: durationNum,
        description: `Agendamento em ${params.slug}`,
        location: address,
      })
    : null;

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      <div className="max-w-lg mx-auto w-full px-4 py-10 flex flex-col items-center gap-6">

        <div className="w-20 h-20 rounded-full bg-[#FAEEDA] flex items-center justify-center">
          <CheckCircle size={44} className="text-[#EF9F27]" strokeWidth={1.5} />
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-[#1B1B1B]">Agendamento confirmado!</h1>
          {confirmationCode && (
            <p className="text-sm text-[#6B6B6B]">
              Código: <span className="font-mono font-bold text-[#1B1B1B]">{confirmationCode}</span>
            </p>
          )}
        </div>

        <div className="w-full bg-white rounded-2xl border border-black/8 p-5 space-y-3.5">
          <div className="flex items-center gap-3">
            <Scissors size={16} className="text-[#9B9B9B] shrink-0" />
            <div>
              <p className="text-xs text-[#9B9B9B]">Serviço</p>
              <p className="text-sm font-semibold text-[#1B1B1B]">{service}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <User size={16} className="text-[#9B9B9B] shrink-0" />
            <div>
              <p className="text-xs text-[#9B9B9B]">Profissional</p>
              <p className="text-sm font-semibold text-[#1B1B1B]">{professional}</p>
            </div>
          </div>

          {date && (
            <>
              <div className="flex items-center gap-3">
                <Calendar size={16} className="text-[#9B9B9B] shrink-0" />
                <div>
                  <p className="text-xs text-[#9B9B9B]">Data</p>
                  <p className="text-sm font-semibold text-[#1B1B1B] capitalize">
                    {format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock size={16} className="text-[#9B9B9B] shrink-0" />
                <div>
                  <p className="text-xs text-[#9B9B9B]">Horário</p>
                  <p className="text-sm font-semibold text-[#1B1B1B]">
                    {format(date, "HH:mm")} · {durationNum} min
                  </p>
                </div>
              </div>
            </>
          )}

          {address && (
            <div className="flex items-center gap-3">
              <MapPin size={16} className="text-[#9B9B9B] shrink-0" />
              <div>
                <p className="text-xs text-[#9B9B9B]">Endereço</p>
                <p className="text-sm font-semibold text-[#1B1B1B]">{address}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1 border-t border-black/5">
            <Tag size={16} className="text-[#9B9B9B] shrink-0" />
            <div>
              <p className="text-xs text-[#9B9B9B]">Total</p>
              <p className="text-sm font-bold text-[#EF9F27]">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(price))}
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-[#6B6B6B] text-center">
          Em instantes você receberá uma confirmação no WhatsApp 📱
        </p>

        <div className="w-full space-y-3">
          {googleCalUrl && (
            <a
              href={googleCalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-12 rounded-xl border-2 border-[#1B1B1B] text-[#1B1B1B] font-semibold text-sm hover:bg-[#1B1B1B] hover:text-white transition-colors"
            >
              <Calendar size={18} />
              Adicionar ao Google Agenda
            </a>
          )}

          <Link
            href={`/${params.slug}`}
            className="flex items-center justify-center w-full h-12 rounded-xl bg-[#F5F5F5] text-[#6B6B6B] font-medium text-sm hover:bg-[#EBEBEB] transition-colors"
          >
            Voltar para o estabelecimento
          </Link>
        </div>
      </div>
    </div>
  );
}
