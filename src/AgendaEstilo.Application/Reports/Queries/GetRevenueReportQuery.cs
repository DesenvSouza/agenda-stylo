using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Reports.Queries;

public record DailyRevenueDto(string Date, decimal Revenue, int Bookings);
public record ServiceRevenueDto(Guid ServiceId, string Name, decimal Revenue, int Count);
public record ProfessionalRevenueDto(Guid ProfessionalId, string Name, string? PhotoUrl, decimal Revenue, int Count);

public record RevenueReportDto(
    decimal TotalRevenue,
    int TotalBookings,
    int CompletedBookings,
    int NoShows,
    int Cancellations,
    List<DailyRevenueDto> ByDay,
    List<ServiceRevenueDto> ByService,
    List<ProfessionalRevenueDto> ByProfessional);

public record GetRevenueReportQuery(Guid EstablishmentId, string Period, DateOnly Date)
    : IRequest<RevenueReportDto>;

public class GetRevenueReportQueryHandler : IRequestHandler<GetRevenueReportQuery, RevenueReportDto>
{
    private readonly IAppDbContext _db;
    public GetRevenueReportQueryHandler(IAppDbContext db) => _db = db;

    public async Task<RevenueReportDto> Handle(GetRevenueReportQuery request, CancellationToken ct)
    {
        var (from, to) = GetDateRange(request.Period, request.Date);

        var fromUtc = DateTime.SpecifyKind(from.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var toUtc = DateTime.SpecifyKind(to.ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc);

        var bookings = await _db.Bookings
            .Include(b => b.Service)
            .Include(b => b.Professional)
            .Where(b =>
                b.EstablishmentId == request.EstablishmentId &&
                b.ScheduledAt >= fromUtc &&
                b.ScheduledAt <= toUtc)
            .ToListAsync(ct);

        var completed = bookings.Where(b => b.Status == BookingStatus.Concluido).ToList();
        var totalRevenue = completed.Sum(b => b.Service?.Price ?? 0);

        var byDay = bookings
            .GroupBy(b => DateOnly.FromDateTime(b.ScheduledAt))
            .OrderBy(g => g.Key)
            .Select(g => new DailyRevenueDto(
                g.Key.ToString("yyyy-MM-dd"),
                g.Where(b => b.Status == BookingStatus.Concluido).Sum(b => b.Service?.Price ?? 0),
                g.Count()))
            .ToList();

        var byService = completed
            .Where(b => b.Service != null)
            .GroupBy(b => new { b.ServiceId, b.Service!.Name })
            .OrderByDescending(g => g.Sum(b => b.Service?.Price ?? 0))
            .Select(g => new ServiceRevenueDto(
                g.Key.ServiceId,
                g.Key.Name,
                g.Sum(b => b.Service?.Price ?? 0),
                g.Count()))
            .ToList();

        var byProfessional = completed
            .Where(b => b.Professional != null)
            .GroupBy(b => new { b.ProfessionalId, b.Professional!.Name, b.Professional.PhotoUrl })
            .OrderByDescending(g => g.Sum(b => b.Service?.Price ?? 0))
            .Select(g => new ProfessionalRevenueDto(
                g.Key.ProfessionalId,
                g.Key.Name,
                g.Key.PhotoUrl,
                g.Sum(b => b.Service?.Price ?? 0),
                g.Count()))
            .ToList();

        return new RevenueReportDto(
            totalRevenue,
            bookings.Count,
            completed.Count,
            bookings.Count(b => b.Status == BookingStatus.NaoCompareceu),
            bookings.Count(b => b.Status == BookingStatus.Cancelado),
            byDay,
            byService,
            byProfessional);
    }

    private static (DateOnly From, DateOnly To) GetDateRange(string period, DateOnly date) => period switch
    {
        "day" => (date, date),
        "week" => (date.AddDays(-(int)date.DayOfWeek == 0 ? 6 : (int)date.DayOfWeek - 1),
                   date.AddDays(date.DayOfWeek == DayOfWeek.Sunday ? 0 : 7 - (int)date.DayOfWeek)),
        "month" => (new DateOnly(date.Year, date.Month, 1),
                    new DateOnly(date.Year, date.Month, DateTime.DaysInMonth(date.Year, date.Month))),
        _ => (date, date)
    };
}
