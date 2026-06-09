using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Constants;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Services.Commands;

public record ToggleServiceActiveCommand(Guid Id) : IRequest<bool>;

public class ToggleServiceActiveCommandHandler
    : IRequestHandler<ToggleServiceActiveCommand, bool>
{
    private readonly IAppDbContext _db;
    public ToggleServiceActiveCommandHandler(IAppDbContext db) => _db = db;

    public async Task<bool> Handle(
        ToggleServiceActiveCommand request, CancellationToken cancellationToken)
    {
        var service = await _db.Services
            .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("Serviço não encontrado.");

        // ── Verificação de limite apenas ao ATIVAR ─────────────────────────────
        if (!service.IsActive)
        {
            var est = await _db.Establishments
                .IgnoreQueryFilters()
                .Where(e => e.Id == service.EstablishmentId && !e.IsDeleted)
                .Select(e => new { e.CurrentPlan })
                .FirstOrDefaultAsync(cancellationToken);

            var limite = PlanConstants.GetLimiteServicos(est?.CurrentPlan);

            if (limite != PlanConstants.LimiteIlimitado)
            {
                // Conta ativos excluindo o próprio (que está inativo e quer ser ativado)
                var activeCount = await _db.Services
                    .CountAsync(
                        s => s.EstablishmentId == service.EstablishmentId
                          && s.IsActive
                          && s.Id != service.Id,
                        cancellationToken);

                if (activeCount >= limite)
                {
                    var planLabel = est?.CurrentPlan == PlanConstants.Profissional
                        ? "Profissional" : "Básico";
                    throw new InvalidOperationException(
                        $"Limite de {limite} serviço(s) ativo(s) atingido para o plano {planLabel}. " +
                        $"Desative outro serviço ou faça upgrade para o plano Profissional.");
                }
            }
        }

        service.IsActive = !service.IsActive;
        await _db.SaveChangesAsync(cancellationToken);
        return service.IsActive;
    }
}
