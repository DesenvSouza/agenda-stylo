using AgendaEstilo.Application.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Admin.Queries;

public record GetFinancialReportQuery(int Year) : IRequest<FinancialReportDto>;

public record FinancialReportDto(
    int Year,
    List<MonthlyRevenueDto> MonthlyRevenue,
    decimal TotalRevenue,
    decimal TotalCommissions,
    decimal NetRevenue);

public record MonthlyRevenueDto(int Month, string MonthName, decimal Revenue, decimal Commissions, int NewEstablishments);

public class GetFinancialReportQueryHandler : IRequestHandler<GetFinancialReportQuery, FinancialReportDto>
{
    private readonly IAppDbContext _db;

    private static readonly string[] MonthNames =
    [
        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
        "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];

    public GetFinancialReportQueryHandler(IAppDbContext db) => _db = db;

    public async Task<FinancialReportDto> Handle(GetFinancialReportQuery request, CancellationToken ct)
    {
        var startOfYear = new DateTime(request.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var endOfYear   = startOfYear.AddYears(1);

        var payments = await _db.PlanSubscriptionPayments
            .IgnoreQueryFilters()
            .Where(p => p.PaidAt >= startOfYear && p.PaidAt < endOfYear)
            .Select(p => new { p.Amount, p.PaidAt })
            .ToListAsync(ct);

        var commissions = await _db.PromoterConversions
            .IgnoreQueryFilters()
            .Where(c => c.ConvertedAt >= startOfYear && c.ConvertedAt < endOfYear)
            .Select(c => new { c.CommissionAmount, c.ConvertedAt })
            .ToListAsync(ct);

        var newEstablishments = await _db.Establishments
            .IgnoreQueryFilters()
            .Where(e => !e.IsDeleted && e.CreatedAt >= startOfYear && e.CreatedAt < endOfYear)
            .Select(e => new { e.CreatedAt })
            .ToListAsync(ct);

        var monthly = Enumerable.Range(1, 12).Select(month =>
        {
            var rev     = payments.Where(p => p.PaidAt.Month == month).Sum(p => p.Amount);
            var comm    = commissions.Where(c => c.ConvertedAt.Month == month).Sum(c => c.CommissionAmount);
            var newEst  = newEstablishments.Count(e => e.CreatedAt.Month == month);
            return new MonthlyRevenueDto(month, MonthNames[month - 1], rev, comm, newEst);
        }).ToList();

        var totalRevenue     = payments.Sum(p => p.Amount);
        var totalCommissions = commissions.Sum(c => c.CommissionAmount);

        return new FinancialReportDto(request.Year, monthly, totalRevenue, totalCommissions, totalRevenue - totalCommissions);
    }
}
