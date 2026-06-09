using AgendaEstilo.Application.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Clients.Queries;

public record ClientDto(Guid Id, string Name, string Phone, string? Email, int VisitCount, DateTime? LastVisitAt, string? Notes);

public record GetClientsQuery(Guid EstablishmentId, string? Search = null, int Page = 1, int PageSize = 20) : IRequest<PagedResult<ClientDto>>;

public class GetClientsQueryHandler : IRequestHandler<GetClientsQuery, PagedResult<ClientDto>>
{
    private readonly IAppDbContext _db;

    public GetClientsQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResult<ClientDto>> Handle(GetClientsQuery request, CancellationToken cancellationToken)
    {
        var query = _db.Clients.Where(c => c.EstablishmentId == request.EstablishmentId);

        if (!string.IsNullOrEmpty(request.Search))
            query = query.Where(c => c.Name.Contains(request.Search) || c.Phone.Contains(request.Search));

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(c => c.LastVisitAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(c => new ClientDto(c.Id, c.Name, c.Phone, c.Email, c.VisitCount, c.LastVisitAt, c.Notes))
            .ToListAsync(cancellationToken);

        return new PagedResult<ClientDto> { Items = items, TotalCount = total, Page = request.Page, PageSize = request.PageSize };
    }
}
