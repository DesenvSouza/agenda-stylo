using AgendaEstilo.Application.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Admin.Queries;

public record ListEstablishmentsAdminQuery(
    string? Search,
    string? Category,
    string? Plan,
    int Page,
    int PageSize) : IRequest<PagedEstablishmentsDto>;

public record PagedEstablishmentsDto(List<EstablishmentAdminDto> Items, int Total, int Page, int PageSize, int TotalPages);

public record EstablishmentAdminDto(
    Guid Id,
    Guid TenantId,
    string Name,
    string Slug,
    string Category,
    string? Phone,
    string? ContactEmail,
    bool IsActive,
    string? ReferralCode,
    string? CurrentPlan,
    decimal TotalRevenue,
    int TotalBookings,
    DateTime CreatedAt);

public class ListEstablishmentsAdminQueryHandler : IRequestHandler<ListEstablishmentsAdminQuery, PagedEstablishmentsDto>
{
    private readonly IAppDbContext _db;

    public ListEstablishmentsAdminQueryHandler(IAppDbContext db) => _db = db;

    public async Task<PagedEstablishmentsDto> Handle(ListEstablishmentsAdminQuery request, CancellationToken ct)
    {
        var query = _db.Establishments
            .IgnoreQueryFilters()
            .Where(e => !e.IsDeleted);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLowerInvariant();
            query = query.Where(e =>
                e.Name.ToLower().Contains(s) ||
                e.Slug.ToLower().Contains(s));
        }

        if (!string.IsNullOrWhiteSpace(request.Category))
            query = query.Where(e => e.Category.ToString() == request.Category);

        var total = await query.CountAsync(ct);

        var establishments = await query
            .OrderByDescending(e => e.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(e => new
            {
                e.Id,
                e.TenantId,
                e.Name,
                e.Slug,
                e.Category,
                e.Phone,
                e.ContactEmail,
                e.IsActive,
                e.ReferralCode,
                e.CreatedAt
            })
            .ToListAsync(ct);

        var ids = establishments.Select(e => e.Id).ToList();

        var payments = await _db.PlanSubscriptionPayments
            .IgnoreQueryFilters()
            .Where(p => ids.Contains(p.EstablishmentId))
            .GroupBy(p => p.EstablishmentId)
            .Select(g => new { EstablishmentId = g.Key, Total = g.Sum(p => p.Amount), LastPlan = g.OrderByDescending(p => p.PaidAt).First().Plan })
            .ToListAsync(ct);

        var bookingCounts = await _db.Bookings
            .IgnoreQueryFilters()
            .Where(b => !b.IsDeleted && ids.Contains(b.EstablishmentId))
            .GroupBy(b => b.EstablishmentId)
            .Select(g => new { EstablishmentId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var items = establishments.Select(e =>
        {
            var pay = payments.FirstOrDefault(p => p.EstablishmentId == e.Id);
            var bk  = bookingCounts.FirstOrDefault(b => b.EstablishmentId == e.Id);
            return new EstablishmentAdminDto(
                e.Id, e.TenantId, e.Name, e.Slug, e.Category.ToString(),
                e.Phone, e.ContactEmail, e.IsActive, e.ReferralCode,
                pay?.LastPlan, pay?.Total ?? 0, bk?.Count ?? 0, e.CreatedAt);
        }).ToList();

        var totalPages = (int)Math.Ceiling(total / (double)request.PageSize);

        return new PagedEstablishmentsDto(items, total, request.Page, request.PageSize, totalPages);
    }
}
