using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Enums;
using AgendaEstilo.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Bookings.Queries;

public record WeekDayDto(DateOnly Date, int BookingsCount, decimal ExpectedRevenue);

public record GetBookingsWeekQuery(Guid EstablishmentId, DateOnly StartDate) : IRequest<List<WeekDayDto>>;

public class GetBookingsWeekQueryHandler : IRequestHandler<GetBookingsWeekQuery, List<WeekDayDto>>
{
    private readonly IAppDbContext _db;
    private readonly ITenantService _tenantService;
    public GetBookingsWeekQueryHandler(IAppDbContext db, ITenantService tenantService)
        => (_db, _tenantService) = (db, tenantService);

    public async Task<List<WeekDayDto>> Handle(GetBookingsWeekQuery request, CancellationToken ct)
    {
        var from = DateTime.SpecifyKind(request.StartDate.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var to = DateTime.SpecifyKind(request.StartDate.AddDays(6).ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc);
        var tenantId = _tenantService.TenantId;

        var bookings = await _db.Bookings
            .IgnoreQueryFilters()
            .Include(b => b.Service)
            .Where(b =>
                b.TenantId == tenantId &&
                !b.IsDeleted &&
                b.EstablishmentId == request.EstablishmentId &&
                b.ScheduledAt >= from && b.ScheduledAt <= to &&
                b.Status != BookingStatus.Cancelado && b.Status != BookingStatus.NaoCompareceu)
            .ToListAsync(ct);

        return Enumerable.Range(0, 7)
            .Select(i => request.StartDate.AddDays(i))
            .Select(day =>
            {
                var dayBookings = bookings
                    .Where(b => DateOnly.FromDateTime(b.ScheduledAt) == day)
                    .ToList();
                return new WeekDayDto(day, dayBookings.Count, dayBookings.Sum(b => b.Service.Price));
            })
            .ToList();
    }
}
