using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Clients.Queries;

public record GetClientBookingsQuery(Guid ClientId, int Page = 1, int PageSize = 20)
    : IRequest<PagedResult<ClientBookingSummaryDto>>;

public class GetClientBookingsQueryHandler : IRequestHandler<GetClientBookingsQuery, PagedResult<ClientBookingSummaryDto>>
{
    private readonly IAppDbContext _db;
    public GetClientBookingsQueryHandler(IAppDbContext db) => _db = db;

    public async Task<PagedResult<ClientBookingSummaryDto>> Handle(
        GetClientBookingsQuery request, CancellationToken cancellationToken)
    {
        var query = _db.Bookings
            .Include(b => b.Service)
            .Include(b => b.Professional)
            .Where(b => b.ClientId == request.ClientId);

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(b => b.ScheduledAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(b => new ClientBookingSummaryDto(
                b.Id,
                b.Service!.Name,
                b.Professional!.Name,
                b.ScheduledAt,
                b.Status,
                b.Service.Price))
            .ToListAsync(cancellationToken);

        return new PagedResult<ClientBookingSummaryDto>
        {
            Items = items,
            TotalCount = total,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }
}
