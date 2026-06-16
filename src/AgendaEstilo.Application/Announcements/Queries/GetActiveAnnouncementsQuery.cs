using AgendaEstilo.Application.Announcements.Commands;
using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Enums;
using AgendaEstilo.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Announcements.Queries;

/// <summary>
/// Retorna comunicados ativos visíveis para o estabelecimento autenticado.
/// Resolve automaticamente o plano via ITenantService.
/// Filtros: IsActive = true, StartsAt &lt;= now &lt;= EndsAt, Target compatível com o plano.
/// Ordenados por Severity DESC (mais críticos primeiro), depois StartsAt ASC.
/// </summary>
public record GetActiveAnnouncementsQuery : IRequest<List<AnnouncementDto>>;

public class GetActiveAnnouncementsQueryHandler : IRequestHandler<GetActiveAnnouncementsQuery, List<AnnouncementDto>>
{
    private readonly IAppDbContext  _db;
    private readonly ITenantService _tenant;

    public GetActiveAnnouncementsQueryHandler(IAppDbContext db, ITenantService tenant)
    {
        _db     = db;
        _tenant = tenant;
    }

    public async Task<List<AnnouncementDto>> Handle(GetActiveAnnouncementsQuery request, CancellationToken cancellationToken)
    {
        // Resolver o plano atual do estabelecimento
        var currentPlan = await _db.Establishments
            .IgnoreQueryFilters()
            .Where(e => e.TenantId == _tenant.TenantId && !e.IsDeleted)
            .Select(e => e.CurrentPlan)
            .FirstOrDefaultAsync(cancellationToken);

        var compatibleTargets = GetCompatibleTargets(currentPlan);
        var now = DateTime.UtcNow;

        var list = await _db.Announcements
            .Where(a =>
                a.IsActive &&
                a.StartsAt <= now &&
                a.EndsAt   >= now &&
                compatibleTargets.Contains(a.Target))
            .OrderByDescending(a => a.Severity)
            .ThenBy(a => a.StartsAt)
            .ToListAsync(cancellationToken);

        return list.Select(UpsertAnnouncementCommandHandler.ToDto).ToList();
    }

    private static List<AnnouncementTarget> GetCompatibleTargets(string? plan)
    {
        // "Todos" sempre aparece para todos os planos.
        // Targets específicos só aparecem para o plano correspondente.
        var targets = new List<AnnouncementTarget> { AnnouncementTarget.Todos };

        if (string.IsNullOrWhiteSpace(plan))
            return targets;

        if (plan.Equals("Basico", StringComparison.OrdinalIgnoreCase))
            targets.Add(AnnouncementTarget.Basico);
        else if (plan.Equals("Profissional", StringComparison.OrdinalIgnoreCase))
            targets.Add(AnnouncementTarget.Profissional);

        return targets;
    }
}
