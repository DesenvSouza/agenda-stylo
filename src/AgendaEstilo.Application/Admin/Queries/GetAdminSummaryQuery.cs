using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Admin.Queries;

public record GetAdminSummaryQuery : IRequest<AdminSummaryDto>;

public record AdminSummaryDto(
    int TotalEstablishments,
    int NewThisMonth,
    int NewLastMonth,
    decimal MrrEstimate,
    decimal TotalRevenue,
    int TotalBookings,
    int TotalBookingsThisMonth,
    int TotalPromoters,
    int ActivePromoters,
    decimal TotalCommissionsOwed,
    Dictionary<string, int> EstablishmentsByCategory,
    List<TopPromoterDto> TopPromotersThisMonth,
    List<TopPromoterDto> TopPromotersAllTime,
    List<RecentEstablishmentDto> RecentEstablishments);

public record TopPromoterDto(Guid Id, string Name, string? PromoterCode, int Conversions, decimal Commission);
public record RecentEstablishmentDto(Guid Id, string Name, string Slug, string Category, DateTime CreatedAt, string? ReferralCode);

public class GetAdminSummaryQueryHandler : IRequestHandler<GetAdminSummaryQuery, AdminSummaryDto>
{
    private readonly IAppDbContext _db;

    public GetAdminSummaryQueryHandler(IAppDbContext db) => _db = db;

    public async Task<AdminSummaryDto> Handle(GetAdminSummaryQuery _, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var startOfMonth     = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var startOfLastMonth = startOfMonth.AddMonths(-1);

        // Estabelecimentos
        var establishments = await _db.Establishments
            .IgnoreQueryFilters()
            .Where(e => !e.IsDeleted)
            .Select(e => new { e.Id, e.Name, e.Slug, e.Category, e.CreatedAt, e.ReferralCode })
            .ToListAsync(ct);

        var totalEstablishments = establishments.Count;
        var newThisMonth        = establishments.Count(e => e.CreatedAt >= startOfMonth);
        var newLastMonth        = establishments.Count(e => e.CreatedAt >= startOfLastMonth && e.CreatedAt < startOfMonth);

        var byCategory = establishments
            .GroupBy(e => e.Category.ToString())
            .ToDictionary(g => g.Key, g => g.Count());

        var recentEstablishments = establishments
            .OrderByDescending(e => e.CreatedAt)
            .Take(5)
            .Select(e => new RecentEstablishmentDto(e.Id, e.Name, e.Slug, e.Category.ToString(), e.CreatedAt, e.ReferralCode))
            .ToList();

        // Pagamentos e MRR
        var payments = await _db.PlanSubscriptionPayments
            .IgnoreQueryFilters()
            .ToListAsync(ct);

        var totalRevenue = payments.Sum(p => p.Amount);

        // MRR: pagamento mais recente por estabelecimento (no mês corrente)
        var mrrEstimate = payments
            .Where(p => p.PaidAt >= startOfMonth)
            .Sum(p => p.Amount);

        // Agendamentos
        var totalBookings = await _db.Bookings.IgnoreQueryFilters().Where(b => !b.IsDeleted).CountAsync(ct);
        var totalBookingsThisMonth = await _db.Bookings.IgnoreQueryFilters()
            .Where(b => !b.IsDeleted && b.ScheduledAt >= startOfMonth).CountAsync(ct);

        // Promotores
        var promoters = await _db.SystemUsers
            .Where(u => u.Role == 1)
            .Select(u => new { u.Id, u.Name, u.PromoterCode, u.IsActive })
            .ToListAsync(ct);

        var totalPromoters  = promoters.Count;
        var activePromoters = promoters.Count(p => p.IsActive);

        // Conversões
        var conversions = await _db.PromoterConversions
            .IgnoreQueryFilters()
            .Select(c => new { c.PromoterId, c.CommissionAmount, c.ConvertedAt })
            .ToListAsync(ct);

        var totalCommissionsOwed = conversions.Sum(c => c.CommissionAmount);

        // Top promotores
        var topThisMonth = conversions
            .Where(c => c.ConvertedAt >= startOfMonth)
            .GroupBy(c => c.PromoterId)
            .Select(g => new { PromoterId = g.Key, Count = g.Count(), Commission = g.Sum(x => x.CommissionAmount) })
            .OrderByDescending(x => x.Count).ThenByDescending(x => x.Commission)
            .Take(3)
            .Select(x =>
            {
                var p = promoters.FirstOrDefault(pr => pr.Id == x.PromoterId);
                return new TopPromoterDto(x.PromoterId, p?.Name ?? "", p?.PromoterCode, x.Count, x.Commission);
            })
            .ToList();

        var topAllTime = conversions
            .GroupBy(c => c.PromoterId)
            .Select(g => new { PromoterId = g.Key, Count = g.Count(), Commission = g.Sum(x => x.CommissionAmount) })
            .OrderByDescending(x => x.Count).ThenByDescending(x => x.Commission)
            .Take(3)
            .Select(x =>
            {
                var p = promoters.FirstOrDefault(pr => pr.Id == x.PromoterId);
                return new TopPromoterDto(x.PromoterId, p?.Name ?? "", p?.PromoterCode, x.Count, x.Commission);
            })
            .ToList();

        return new AdminSummaryDto(
            totalEstablishments, newThisMonth, newLastMonth,
            mrrEstimate, totalRevenue,
            totalBookings, totalBookingsThisMonth,
            totalPromoters, activePromoters, totalCommissionsOwed,
            byCategory, topThisMonth, topAllTime, recentEstablishments);
    }
}
