using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Bookings.Commands;

public record CancelBookingCommand(string CancelToken) : IRequest;

public class CancelBookingCommandHandler : IRequestHandler<CancelBookingCommand>
{
    private readonly IAppDbContext _db;
    private readonly ISlotCacheService _slotCache;
    private readonly IBookingNotificationService _notifications;

    public CancelBookingCommandHandler(IAppDbContext db, ISlotCacheService slotCache, IBookingNotificationService notifications)
    {
        _db = db;
        _slotCache = slotCache;
        _notifications = notifications;
    }

    public async Task Handle(CancelBookingCommand request, CancellationToken cancellationToken)
    {
        var booking = await _db.Bookings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(b => b.CancelToken == request.CancelToken, cancellationToken)
            ?? throw new KeyNotFoundException("Token de cancelamento inválido.");

        if (booking.Status == BookingStatus.Cancelado)
            throw new InvalidOperationException("Agendamento já cancelado.");

        if (booking.ScheduledAt < DateTime.UtcNow)
            throw new InvalidOperationException("Não é possível cancelar agendamentos passados.");

        booking.Status = BookingStatus.Cancelado;
        await _db.SaveChangesAsync(cancellationToken);

        // Libera os slots e notifica o cliente
        _slotCache.InvalidateScope(
            $"{booking.EstablishmentId}_{DateOnly.FromDateTime(booking.ScheduledAt)}");

        _notifications.EnqueueCancellation(booking.Id);
    }
}
