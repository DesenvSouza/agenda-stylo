using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Entities;
using AgendaEstilo.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Professionals.Commands;

public record SetProfessionalServicesCommand(
    Guid ProfessionalId,
    List<Guid> ServiceIds) : IRequest;

public class SetProfessionalServicesCommandHandler
    : IRequestHandler<SetProfessionalServicesCommand>
{
    private readonly IAppDbContext _db;
    private readonly ITenantService _tenantService;

    public SetProfessionalServicesCommandHandler(
        IAppDbContext db, ITenantService tenantService)
    {
        _db = db;
        _tenantService = tenantService;
    }

    public async Task Handle(
        SetProfessionalServicesCommand request, CancellationToken cancellationToken)
    {
        // Busca todos os vínculos (incluindo soft-deleted) para este profissional
        var existing = await _db.ProfessionalServices
            .IgnoreQueryFilters()
            .Where(ps =>
                ps.ProfessionalId == request.ProfessionalId &&
                ps.TenantId == _tenantService.TenantId)
            .ToListAsync(cancellationToken);

        // Soft-deleta todos os existentes
        foreach (var ps in existing)
            ps.IsDeleted = true;

        // Para cada serviço da nova lista: restaura se já existia, cria se é novo
        foreach (var serviceId in request.ServiceIds.Distinct())
        {
            var match = existing.FirstOrDefault(ps => ps.ServiceId == serviceId);
            if (match != null)
            {
                match.IsDeleted = false;
            }
            else
            {
                _db.ProfessionalServices.Add(new ProfessionalService
                {
                    TenantId = _tenantService.TenantId,
                    ProfessionalId = request.ProfessionalId,
                    ServiceId = serviceId,
                });
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
    }
}
