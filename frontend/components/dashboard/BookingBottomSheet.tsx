"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Check, XCircle, UserX, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { bookingsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  professionalName: string;
  scheduledAt: string;
  status: number;
}

interface Props {
  booking: Booking;
  onClose: () => void;
  onStatusChange: () => void;
}

const STATUS = {
  1: { label: "Pendente", color: "bg-amber-100 text-amber-700" },
  2: { label: "Confirmado", color: "bg-blue-100 text-blue-700" },
  3: { label: "Concluído", color: "bg-green-100 text-green-700" },
  4: { label: "Cancelado", color: "bg-red-100 text-red-700" },
  5: { label: "Não compareceu", color: "bg-gray-100 text-gray-600" },
};

export function BookingBottomSheet({ booking, onClose, onStatusChange }: Props) {
  const status = STATUS[booking.status as keyof typeof STATUS] ?? STATUS[1];

  const updateStatus = async (newStatus: number) => {
    await bookingsApi.updateStatus(booking.id, newStatus);
    onStatusChange();
    onClose();
  };

  const scheduled = new Date(booking.scheduledAt);
  // Ações de conclusão/não-comparecimento só liberadas a partir do horário do atendimento
  const isFuture = scheduled > new Date();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#D4D4D4] rounded-full" />
        </div>

        <div className="flex items-start justify-between px-5 pt-2 pb-4 border-b border-black/8">
          <div>
            <h3 className="font-bold text-lg text-[#1B1B1B]">{booking.clientName}</h3>
            <p className="text-sm text-[#6B6B6B]">{booking.serviceName} · {booking.professionalName}</p>
            <p className="text-sm font-mono font-bold text-[#1B1B1B] mt-1">
              {format(scheduled, "HH:mm")} · {format(scheduled, "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", status.color)}>
              {status.label}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F5F5F5]">
              <X size={18} />
            </button>
          </div>
        </div>

        {booking.clientPhone && (
          <div className="px-5 py-3 border-b border-black/5">
            <a href={`tel:${booking.clientPhone}`} className="text-sm text-[#EF9F27] font-medium">
              📱 {booking.clientPhone}
            </a>
          </div>
        )}

        {/* Ações */}
        <div className="px-5 py-4 space-y-2">
          <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide mb-3">Ações</p>

          {booking.status !== 2 && booking.status !== 3 && booking.status !== 4 && (
            <ActionButton
              icon={<Clock size={18} />}
              label="Confirmar"
              color="bg-blue-50 text-blue-700 border-blue-200"
              onClick={() => updateStatus(2)}
            />
          )}

          {booking.status !== 3 && booking.status !== 4 && (
            <ActionButton
              icon={<Check size={18} />}
              label="Concluir atendimento"
              color="bg-green-50 text-green-700 border-green-200"
              onClick={() => updateStatus(3)}
              disabled={isFuture}
              disabledReason={`Disponível a partir das ${format(scheduled, "HH:mm 'de' dd/MM")}`}
            />
          )}

          {booking.status !== 5 && booking.status !== 4 && booking.status !== 3 && (
            <ActionButton
              icon={<UserX size={18} />}
              label="Registrar não comparecimento"
              color="bg-gray-50 text-gray-600 border-gray-200"
              onClick={() => updateStatus(5)}
              disabled={isFuture}
              disabledReason={`Disponível a partir das ${format(scheduled, "HH:mm 'de' dd/MM")}`}
            />
          )}

          {booking.status !== 4 && (
            <ActionButton
              icon={<XCircle size={18} />}
              label="Cancelar agendamento"
              color="bg-red-50 text-red-600 border-red-200"
              onClick={() => updateStatus(4)}
            />
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

function ActionButton({ icon, label, color, onClick, disabled, disabledReason }: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <div className="space-y-1">
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-sm font-semibold transition-all",
          disabled
            ? "bg-[#F5F5F5] text-[#C4C4C4] border-[#E8E8E8] cursor-not-allowed opacity-60"
            : cn("active:scale-[0.98]", color),
        )}
      >
        {icon}
        {label}
      </button>
      {disabled && disabledReason && (
        <p className="text-xs text-[#9B9B9B] pl-1">{disabledReason}</p>
      )}
    </div>
  );
}
