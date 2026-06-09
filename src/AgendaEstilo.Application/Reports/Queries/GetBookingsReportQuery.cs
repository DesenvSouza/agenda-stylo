using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Reports.Queries;

public record HourlyCountDto(int Hour, int Count);
public record DayOfWeekCountDto(int Day, string DayName, int Count);
public record SourceBreakdownDto(int Online, int Presencial, int Manual);

public record BookingsReportDto(
    int TotalBookings,
    double CompletionRate,
    double NoShowRate,
    double CancellationRate,
    List<HourlyCountDto> ByHour,
    List<DayOfWeekCountDto> ByDayOfWeek,
    SourceBreakdownDto BySource);

public record GetBookingsReportQuery(Guid EstablishmentId, string Period, DateOnly Date)
    : IRequest<BookingsReportDto>;

public class GetBookingsReportQueryHandler : IRequestHandler<GetBookingsReportQuery, BookingsReportDto>
{
    private readonly IAppDbContext _db;
    public GetBookingsReportQueryHandler(IAppDbContext db) => _db = db;

    public async Task<BookingsReportDto> Handle(GetBookingsReportQuery request, CancellationToken ct)
    {
        var (from, to) = GetDateRange(request.Period, request.Date);
        var fromUtc = DateTime.SpecifyKind(from.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var toUtc = DateTime.SpecifyKind(to.ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc);

        var bookings = await _db.Bookings
            .Where(b =>
                b.EstablishmentId == request.EstablishmentId &&
                b.ScheduledAt >= fromUtc &&
                b.ScheduledAt <= toUtc)
            .ToListAsync(ct);

        var total = bookings.Count;
        if (total == 0)
            return new BookingsReportDto(0, 0, 0, 0, [], [], new SourceBreakdownDto(0, 0, 0));

        var completed = bookings.Count(b => b.Status == BookingStatus.Concluido);
        var noShows = bookings.Count(b => b.Status == BookingStatus.NaoCompareceu);
        var cancelled = bookings.Count(b => b.Status == BookingStatus.Cancelado);

        var byHour = bookings
            .GroupBy(b => b.ScheduledAt.Hour)
            .OrderBy(g => g.Key)
            .Select(g => new HourlyCountDto(g.Key, g.Count()))
            .ToList();

        var dayNames = new[] { "Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb" };
        var byDayOfWeek = bookings
            .GroupBy(b => (int)b.ScheduledAt.DayOfWeek)
            .OrderBy(g => g.Key)
            .Select(g => new DayOfWeekCountDto(g.Key, dayNames[g.Key], g.Count()))
            .ToList();

        var bySource = new SourceBreakdownDto(
            bookings.Count(b => b.Source == BookingSource.Online),
            bookings.Count(b => b.Source == BookingSource.Presencial),
            bookings.Count(b => b.Source == BookingSource.Manual));

        return new BookingsReportDto(
            total,
            Math.Round((double)completed / total * 100, 1),
            Math.Round((double)noShows / total * 100, 1),
            Math.Round((double)cancelled / total * 100, 1),
            byHour,
            byDayOfWeek,
            bySource);
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
