using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Enums;
using AgendaEstilo.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Reports.Queries;

public record TopProfessionalDto(
    Guid ProfessionalId,
    string Name,
    string? PhotoUrl,
    string? Specialty,
    int ServicesCount,
    decimal TotalRevenue,
    DateTime? LastServiceAt);

/// <summary>
/// Ranking de profissionais por período.
/// Period: "day" | "week" | "month" | "all"
/// SortBy: "services" | "revenue"
/// </summary>
public record GetTopProfessionalsQuery(
    Guid EstablishmentId,
    string Period,
    DateOnly? Date,
    string SortBy = "services",
    int Top = 20) : IRequest<List<TopProfessionalDto>>;

public class GetTopProfessionalsQueryHandler : IRequestHandler<GetTopProfessionalsQuery, List<TopProfessionalDto>>
{
    private readonly IAppDbContext _db;
    private readonly ITenantService _tenantService;

    public GetTopProfessionalsQueryHandler(IAppDbContext db, ITenantService tenantService)
        => (_db, _tenantService) = (db, tenantService);

    public async Task<List<TopProfessionalDto>> Handle(GetTopProfessionalsQuery request, CancellationToken ct)
    {
        var tenantId = _tenantService.TenantId;

        // Apenas agendamentos concluídos contam como atendimento
        var query = _db.Bookings
            .IgnoreQueryFilters()
            .Include(b => b.Professional)
            .Include(b => b.Service)
            .Where(b =>
                b.TenantId == tenantId &&
                !b.IsDeleted &&
                b.EstablishmentId == request.EstablishmentId &&
                b.Status == BookingStatus.Concluido &&
                b.Professional != null &&
                !b.Professional.IsDeleted);

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
            .GroupBy(b => new
            {
                b.ProfessionalId,
                b.Professional!.Name,
                b.Professional.PhotoUrl,
                b.Professional.Specialty,
            })
            .Select(g => new TopProfessionalDto(
                g.Key.ProfessionalId,
                g.Key.Name,
                g.Key.PhotoUrl,
                g.Key.Specialty,
                g.Count(),
                g.Sum(b => b.Service?.Price ?? 0),
                g.Max(b => (DateTime?)b.ScheduledAt)))
            .ToList();

        grouped = request.SortBy == "revenue"
            ? grouped.OrderByDescending(p => p.TotalRevenue).ThenByDescending(p => p.ServicesCount).ToList()
            : grouped.OrderByDescending(p => p.ServicesCount).ThenByDescending(p => p.TotalRevenue).ToList();

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
