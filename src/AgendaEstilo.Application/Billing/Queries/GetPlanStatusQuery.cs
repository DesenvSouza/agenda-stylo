using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Constants;
using AgendaEstilo.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Billing.Queries;

public record GetPlanStatusQuery : IRequest<PlanStatusDto>;

public record PlanStatusDto(
    string? CurrentPlan,
    string  CurrentPlanLabel,
    decimal CurrentPrice,
    bool    IsActive,
    DateTime? ExpiresAt,
    // Uso
    int ProfessionalsUsed,
    int ProfessionalsLimit,
    int ServicesUsed,
    int ServicesLimit,
    // Planos disponíveis
    IReadOnlyList<AvailablePlanDto> AvailablePlans
);

public record AvailablePlanDto(
    string  Id,
    string  Label,
    decimal Price,
    int     ProfessionalsLimit,   // int.MaxValue = ilimitado
    int     ServicesLimit,
    bool    IsCurrent
);

public class GetPlanStatusQueryHandler : IRequestHandler<GetPlanStatusQuery, PlanStatusDto>
{
    private readonly IAppDbContext   _db;
    private readonly ITenantService  _tenant;

    public GetPlanStatusQueryHandler(IAppDbContext db, ITenantService tenant)
    {
        _db     = db;
        _tenant = tenant;
    }

    public async Task<PlanStatusDto> Handle(GetPlanStatusQuery request, CancellationToken cancellationToken)
    {
        var est = await _db.Establishments
            .IgnoreQueryFilters()
            .Where(e => e.TenantId == _tenant.TenantId && !e.IsDeleted)
            .Select(e => new { e.CurrentPlan, e.PlanExpiresAt })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("Estabelecimento não encontrado.");

        // Conta apenas ATIVOS — o limite do plano é sobre profissionais/serviços ativos
        var profCount = await _db.Professionals
            .CountAsync(p => p.IsActive, cancellationToken);   // tenant filter já aplicado

        var svcCount = await _db.Services
            .CountAsync(s => s.IsActive, cancellationToken);   // tenant filter já aplicado

        var plan    = est.CurrentPlan;
        var expires = est.PlanExpiresAt;
        var isActive = plan != null && (expires == null || expires > DateTime.UtcNow);

        var profLimit = PlanConstants.GetLimiteProfissionais(plan);
        var svcLimit  = PlanConstants.GetLimiteServicos(plan);

        static string Label(string? p) => p switch
        {
            PlanConstants.Profissional => "Profissional",
            PlanConstants.Basico       => "Básico",
            _                          => "Sem plano",
        };

        var available = new List<AvailablePlanDto>
        {
            new(
                PlanConstants.Basico,
                "Básico",
                PlanConstants.PrecoBasico,
                PlanConstants.LimiteProfissionaisBasico,
                PlanConstants.LimiteServicosBasico,
                plan == PlanConstants.Basico
            ),
            new(
                PlanConstants.Profissional,
                "Profissional",
                PlanConstants.PrecoProfissional,
                PlanConstants.LimiteIlimitado,
                PlanConstants.LimiteIlimitado,
                plan == PlanConstants.Profissional
            ),
        };

        return new PlanStatusDto(
            plan,
            Label(plan),
            plan != null ? PlanConstants.GetPreco(plan) : 0m,
            isActive,
            expires,
            profCount,
            profLimit,
            svcCount,
            svcLimit,
            available
        );
    }
}
