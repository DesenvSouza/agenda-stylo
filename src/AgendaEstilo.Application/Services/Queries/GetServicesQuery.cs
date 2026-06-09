using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Services.Queries;

public record ServiceDto(
    Guid Id, string Name, string? Category,
    int DurationMinutes, decimal Price, string? Description,
    bool IsActive, int Order,
    CommissionType CommissionType, decimal CommissionValue);

public record GetServicesQuery(Guid EstablishmentId) : IRequest<List<ServiceDto>>;

public class GetServicesQueryHandler : IRequestHandler<GetServicesQuery, List<ServiceDto>>
{
    private readonly IAppDbContext _db;

    public GetServicesQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<List<ServiceDto>> Handle(GetServicesQuery request, CancellationToken cancellationToken)
    {
        return await _db.Services
            .Where(s => s.EstablishmentId == request.EstablishmentId && s.IsActive)
            .OrderBy(s => s.Order)
            .Select(s => new ServiceDto(s.Id, s.Name, s.Category, s.DurationMinutes, s.Price, s.Description, s.IsActive, s.Order, s.CommissionType, s.CommissionValue))
            .ToListAsync(cancellationToken);
    }
}
