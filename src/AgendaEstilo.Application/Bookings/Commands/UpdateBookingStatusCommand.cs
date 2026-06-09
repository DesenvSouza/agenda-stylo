using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Bookings.Commands;

public record UpdateBookingStatusCommand(Guid BookingId, BookingStatus Status) : IRequest;

public class UpdateBookingStatusCommandHandler : IRequestHandler<UpdateBookingStatusCommand>
{
    private readonly IAppDbContext _db;
    private readonly IBookingNotificationService _notifications;
    private readonly ISlotCacheService _slotCache;

    public UpdateBookingStatusCommandHandler(
        IAppDbContext db,
        IBookingNotificationService notifications,
        ISlotCacheService slotCache)
    {
        _db = db; _notifications = notifications; _slotCache = slotCache;
    }

    public async Task Handle(UpdateBookingStatusCommand request, CancellationToken ct)
    {
        var booking = await _db.Bookings
            .FirstOrDefaultAsync(b => b.Id == request.BookingId, ct)
            ?? throw new KeyNotFoundException("Agendamento não encontrado.");

        // Concluído e Não compareceu só podem ser registrados após o início do atendimento
        if (request.Status is BookingStatus.Concluido or BookingStatus.NaoCompareceu
            && booking.ScheduledAt > DateTime.UtcNow)
        {
            throw new InvalidOperationException(
                "Este status só pode ser aplicado a partir do horário do atendimento.");
        }

        var previous = booking.Status;
        booking.Status = request.Status;

        if (request.Status == BookingStatus.Concluido)
        {
            var client = await _db.Clients
                .FirstOrDefaultAsync(c => c.Id == booking.ClientId, ct);
            if (client != null)
            {
                client.VisitCount++;
                client.LastVisitAt = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync(ct);

        _slotCache.InvalidateScope($"{booking.EstablishmentId}_{DateOnly.FromDateTime(booking.ScheduledAt)}");

        if (request.Status == BookingStatus.Cancelado && previous != BookingStatus.Cancelado)
            _notifications.EnqueueCancellation(booking.Id);

        if (request.Status == BookingStatus.Concluido && previous != BookingStatus.Concluido)
            _notifications.EnqueueThankYou(booking.Id);
    }
}
