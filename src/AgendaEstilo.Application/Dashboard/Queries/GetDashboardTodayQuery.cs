using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Enums;
using AgendaEstilo.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Dashboard.Queries;

public record ProfessionalBookingCount(Guid ProfessionalId, string Name, string? PhotoUrl, int BookingsCount);

public record DashboardTodayDto(
    DateOnly Date,
    int TotalBookings,
    int ConfirmedBookings,
    int CompletedBookings,
    int CancelledBookings,
    int NoShowBookings,
    decimal ExpectedRevenue,
    decimal CompletedRevenue,
    List<ProfessionalBookingCount> ByProfessional);

public record GetDashboardTodayQuery(Guid EstablishmentId) : IRequest<DashboardTodayDto>;

public class GetDashboardTodayQueryHandler : IRequestHandler<GetDashboardTodayQuery, DashboardTodayDto>
{
    private readonly IAppDbContext _db;
    private readonly ITenantService _tenantService;
    public GetDashboardTodayQueryHandler(IAppDbContext db, ITenantService tenantService)
        => (_db, _tenantService) = (db, tenantService);

    public async Task<DashboardTodayDto> Handle(GetDashboardTodayQuery request, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var start = DateTime.SpecifyKind(today.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var end = DateTime.SpecifyKind(today.ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc);
        var tenantId = _tenantService.TenantId;

        // IgnoreQueryFilters para evitar que o filtro global seja aplicado nas
        // entidades incluídas (Professional, Service) — o filtro de tenant é
        // reaplicado manualmente apenas no Booking.
        var bookings = await _db.Bookings
            .IgnoreQueryFilters()
            .Include(b => b.Professional)
            .Include(b => b.Service)
            .Where(b =>
                b.TenantId == tenantId &&
                !b.IsDeleted &&
                b.EstablishmentId == request.EstablishmentId &&
                b.ScheduledAt >= start && b.ScheduledAt <= end)
            .ToListAsync(ct);

        var active = bookings.Where(b =>
            b.Status != BookingStatus.Cancelado && b.Status != BookingStatus.NaoCompareceu).ToList();

        var byProfessional = active
            .GroupBy(b => new { b.ProfessionalId, b.Professional.Name, b.Professional.PhotoUrl })
            .Select(g => new ProfessionalBookingCount(
                g.Key.ProfessionalId, g.Key.Name, g.Key.PhotoUrl, g.Count()))
            .OrderByDescending(x => x.BookingsCount)
            .ToList();

        return new DashboardTodayDto(
            Date: today,
            TotalBookings: active.Count,
            ConfirmedBookings: bookings.Count(b => b.Status == BookingStatus.Confirmado),
            CompletedBookings: bookings.Count(b => b.Status == BookingStatus.Concluido),
            CancelledBookings: bookings.Count(b => b.Status == BookingStatus.Cancelado),
            NoShowBookings: bookings.Count(b => b.Status == BookingStatus.NaoCompareceu),
            ExpectedRevenue: active.Sum(b => b.Service.Price),
            CompletedRevenue: bookings.Where(b => b.Status == BookingStatus.Concluido).Sum(b => b.Service.Price),
            ByProfessional: byProfessional);
    }
}
