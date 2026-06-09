using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Enums;
using AgendaEstilo.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Reports.Queries;

public record TopClientDto(
    Guid ClientId,
    string Name,
    string Phone,
    int VisitCount,
    decimal TotalSpent,
    DateTime? LastVisitAt);

/// <summary>
/// Ranking de clientes por período.
/// Period: "day" | "week" | "month" | "all"
/// SortBy: "visits" | "spent"
/// </summary>
public record GetTopClientsQuery(
    Guid EstablishmentId,
    string Period,
    DateOnly? Date,
    string SortBy = "visits",
    int Top = 20) : IRequest<List<TopClientDto>>;

public class GetTopClientsQueryHandler : IRequestHandler<GetTopClientsQuery, List<TopClientDto>>
{
    private readonly IAppDbContext _db;
    private readonly ITenantService _tenantService;

    public GetTopClientsQueryHandler(IAppDbContext db, ITenantService tenantService)
        => (_db, _tenantService) = (db, tenantService);

    public async Task<List<TopClientDto>> Handle(GetTopClientsQuery request, CancellationToken ct)
    {
        var tenantId = _tenantService.TenantId;

        // Apenas agendamentos concluídos contam como comparecimento
        var query = _db.Bookings
            .IgnoreQueryFilters()
            .Include(b => b.Client)
            .Include(b => b.Service)
            .Where(b =>
                b.TenantId == tenantId &&
                !b.IsDeleted &&
                b.EstablishmentId == request.EstablishmentId &&
                b.Status == BookingStatus.Concluido &&
                b.Client != null &&
                !b.Client.IsDeleted);

        // Filtro de período (null/empty/"all" = sem filtro de data)
        if (!string.IsNullOrEmpty(request.Period) && request.Period != "all" && request.Date.HasValue)
        {
            var (from, to) = GetDateRange(request.Period, request.Date.Value);
            var fromUtc = DateTime.SpecifyKind(from.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            var toUtc   = DateTime.SpecifyKind(to.ToDateTime(TimeOnly.MaxValue),   DateTimeKind.Utc);
            query = query.Where(b => b.ScheduledAt >= fromUtc && b.ScheduledAt <= toUtc);
        }

        var raw = await query.ToListAsync(ct);

        var grouped = raw
            .GroupBy(b => new { b.ClientId, b.Client!.Name, b.Client.Phone, b.Client.LastVisitAt })
            .Select(g => new TopClientDto(
                g.Key.ClientId,
                g.Key.Name,
                g.Key.Phone,
                g.Count(),
                g.Sum(b => b.Service?.Price ?? 0),
                g.Key.LastVisitAt))
            .ToList();

        grouped = request.SortBy == "spent"
            ? grouped.OrderByDescending(c => c.TotalSpent).ThenByDescending(c => c.VisitCount).ToList()
            : grouped.OrderByDescending(c => c.VisitCount).ThenByDescending(c => c.TotalSpent).ToList();

        return grouped.Take(request.Top).ToList();
    }

    private static (DateOnly From, DateOnly To) GetDateRange(string period, DateOnly date) => period switch
    {
        "day"   => (date, date),
        "week"  => (date.AddDays(-(int)date.DayOfWeek == 0 ? 6 : (int)date.DayOfWeek - 1),
                    date.AddDays(date.DayOfWeek == DayOfWeek.Sunday ? 0 : 7 - (int)date.DayOfWeek)),
        "month" => (new DateOnly(date.Year, date.Month, 1),
                    new DateOnly(date.Year, date.Month, DateTime.DaysInMonth(date.Year, date.Month))),
        _       => (date, date)
    };
}
