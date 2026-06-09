using AgendaEstilo.Application.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Admin.Queries;

public record ListPromotersQuery(string? Search, bool? ActiveOnly) : IRequest<List<PromoterListDto>>;

public record PromoterListDto(
    Guid Id,
    string Name,
    string Email,
    string? PromoterCode,
    decimal CommissionPercent,
    bool IsActive,
    bool MustChangePassword,
    int TotalConversions,
    decimal TotalCommission,
    int ConversionsThisMonth,
    decimal CommissionThisMonth,
    DateTime CreatedAt);

public class ListPromotersQueryHandler : IRequestHandler<ListPromotersQuery, List<PromoterListDto>>
{
    private readonly IAppDbContext _db;

    public ListPromotersQueryHandler(IAppDbContext db) => _db = db;

    public async Task<List<PromoterListDto>> Handle(ListPromotersQuery request, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var query = _db.SystemUsers.Where(u => u.Role == 1);

        if (request.ActiveOnly == true)
            query = query.Where(u => u.IsActive);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLowerInvariant();
            query = query.Where(u =>
                u.Name.ToLower().Contains(s) ||
                u.Email.ToLower().Contains(s) ||
                (u.PromoterCode != null && u.PromoterCode.ToLower().Contains(s)));
        }

        var promoters = await query
            .OrderBy(u => u.Name)
            .ToListAsync(ct);

        var promoterIds = promoters.Select(p => p.Id).ToList();

        var conversions = await _db.PromoterConversions
            .IgnoreQueryFilters()
            .Where(c => promoterIds.Contains(c.PromoterId))
            .Select(c => new { c.PromoterId, c.CommissionAmount, c.ConvertedAt })
            .ToListAsync(ct);

        return promoters.Select(p =>
        {
            var all     = conversions.Where(c => c.PromoterId == p.Id).ToList();
            var thisMonth = all.Where(c => c.ConvertedAt >= startOfMonth).ToList();
            return new PromoterListDto(
                p.Id, p.Name, p.Email, p.PromoterCode,
                p.CommissionPercent, p.IsActive, p.MustChangePassword,
                all.Count, all.Sum(c => c.CommissionAmount),
                thisMonth.Count, thisMonth.Sum(c => c.CommissionAmount),
                p.CreatedAt);
        }).ToList();
    }
}
