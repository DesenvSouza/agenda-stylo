using AgendaEstilo.Application.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Admin.Queries;

public record GetPromoterStatsQuery(Guid PromoterId) : IRequest<PromoterStatsDto>;

public record PromoterStatsDto(
    Guid Id,
    string Name,
    string Email,
    string? PromoterCode,
    decimal CommissionPercent,
    bool IsActive,
    bool MustChangePassword,
    int TotalConversions,
    decimal TotalCommission,
    List<PromoterConversionDto> Conversions,
    List<MonthlyPromoterStatsDto> MonthlyStats);

public record PromoterConversionDto(
    Guid EstablishmentId,
    string EstablishmentName,
    string Plan,
    decimal PlanAmount,
    decimal CommissionAmount,
    DateTime ConvertedAt);

public record MonthlyPromoterStatsDto(int Year, int Month, string MonthName, int Conversions, decimal Commission);

public class GetPromoterStatsQueryHandler : IRequestHandler<GetPromoterStatsQuery, PromoterStatsDto>
{
    private readonly IAppDbContext _db;

    private static readonly string[] MonthNames =
    [
        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
        "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];

    public GetPromoterStatsQueryHandler(IAppDbContext db) => _db = db;

    public async Task<PromoterStatsDto> Handle(GetPromoterStatsQuery request, CancellationToken ct)
    {
        var promoter = await _db.SystemUsers
            .FirstOrDefaultAsync(u => u.Id == request.PromoterId && u.Role == 1, ct)
            ?? throw new InvalidOperationException("Promotor não encontrado.");

        var rawConversions = await _db.PromoterConversions
            .IgnoreQueryFilters()
            .Where(c => c.PromoterId == request.PromoterId)
            .OrderByDescending(c => c.ConvertedAt)
            .Select(c => new { c.EstablishmentId, c.Plan, c.PlanAmount, c.CommissionAmount, c.ConvertedAt })
            .ToListAsync(ct);

        var establishmentIds = rawConversions.Select(c => c.EstablishmentId).Distinct().ToList();
        var establishments = await _db.Establishments
            .IgnoreQueryFilters()
            .Where(e => establishmentIds.Contains(e.Id))
            .Select(e => new { e.Id, e.Name })
            .ToListAsync(ct);

        var conversionDtos = rawConversions.Select(c =>
        {
            var est = establishments.FirstOrDefault(e => e.Id == c.EstablishmentId);
            return new PromoterConversionDto(c.EstablishmentId, est?.Name ?? "", c.Plan, c.PlanAmount, c.CommissionAmount, c.ConvertedAt);
        }).ToList();

        // Estatísticas mensais (últimos 12 meses)
        var now = DateTime.UtcNow;
        var monthlyStats = Enumerable.Range(0, 12)
            .Select(i =>
            {
                var d    = now.AddMonths(-i);
                var year = d.Year;
                var mon  = d.Month;
                var start = new DateTime(year, mon, 1, 0, 0, 0, DateTimeKind.Utc);
                var end   = start.AddMonths(1);
                var slice = rawConversions.Where(c => c.ConvertedAt >= start && c.ConvertedAt < end).ToList();
                return new MonthlyPromoterStatsDto(year, mon, MonthNames[mon - 1], slice.Count, slice.Sum(c => c.CommissionAmount));
            })
            .OrderBy(m => m.Year).ThenBy(m => m.Month)
            .ToList();

        return new PromoterStatsDto(
            promoter.Id, promoter.Name, promoter.Email,
            promoter.PromoterCode, promoter.CommissionPercent,
            promoter.IsActive, promoter.MustChangePassword,
            rawConversions.Count, rawConversions.Sum(c => c.CommissionAmount),
            conversionDtos, monthlyStats);
    }
}
