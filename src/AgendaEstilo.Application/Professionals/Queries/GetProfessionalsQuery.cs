using AgendaEstilo.Application.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Professionals.Queries;

public record ProfessionalDto(
    Guid Id,
    string Name,
    string? PhotoUrl,
    string? Specialty,
    string? Bio,
    bool IsActive,
    int Order,
    List<Guid> ServiceIds,
    string? Cpf,
    string? WhatsApp,
    bool HasUserAccount);

public record GetProfessionalsQuery(Guid EstablishmentId) : IRequest<List<ProfessionalDto>>;

public class GetProfessionalsQueryHandler : IRequestHandler<GetProfessionalsQuery, List<ProfessionalDto>>
{
    private readonly IAppDbContext _db;

    public GetProfessionalsQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<List<ProfessionalDto>> Handle(
        GetProfessionalsQuery request, CancellationToken cancellationToken)
    {
        var professionals = await _db.Professionals
            .Include(p => p.ProfessionalServices)
            .Where(p => p.EstablishmentId == request.EstablishmentId)
            .OrderBy(p => p.Order)
            .ThenBy(p => p.Name)
            .ToListAsync(cancellationToken);

        // Quais profissionais já têm conta de acesso ativa
        var profIds = professionals.Select(p => p.Id).ToList();
        var usersWithAccess = await _db.Users
            .IgnoreQueryFilters()
            .Where(u => u.ProfessionalId.HasValue && profIds.Contains(u.ProfessionalId!.Value) && !u.IsDeleted)
            .Select(u => u.ProfessionalId!.Value)
            .ToListAsync(cancellationToken);

        return professionals.Select(p => new ProfessionalDto(
            p.Id,
            p.Name,
            p.PhotoUrl,
            p.Specialty,
            p.Bio,
            p.IsActive,
            p.Order,
            p.ProfessionalServices.Select(ps => ps.ServiceId).ToList(),
            p.Cpf,
            p.WhatsApp,
            usersWithAccess.Contains(p.Id)
        )).ToList();
    }
}
