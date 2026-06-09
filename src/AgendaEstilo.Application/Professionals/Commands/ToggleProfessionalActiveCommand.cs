using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Constants;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Professionals.Commands;

public record ToggleProfessionalActiveCommand(Guid Id) : IRequest<bool>;

public class ToggleProfessionalActiveCommandHandler
    : IRequestHandler<ToggleProfessionalActiveCommand, bool>
{
    private readonly IAppDbContext _db;
    public ToggleProfessionalActiveCommandHandler(IAppDbContext db) => _db = db;

    public async Task<bool> Handle(
        ToggleProfessionalActiveCommand request, CancellationToken cancellationToken)
    {
        var professional = await _db.Professionals
            .FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("Profissional não encontrado.");

        // ── Verificação de limite apenas ao ATIVAR ─────────────────────────────
        if (!professional.IsActive)
        {
            var est = await _db.Establishments
                .IgnoreQueryFilters()
                .Where(e => e.Id == professional.EstablishmentId && !e.IsDeleted)
                .Select(e => new { e.CurrentPlan })
                .FirstOrDefaultAsync(cancellationToken);

            var limite = PlanConstants.GetLimiteProfissionais(est?.CurrentPlan);

            if (limite != PlanConstants.LimiteIlimitado)
            {
                // Conta ativos excluindo o próprio (que está inativo e quer ser ativado)
                var activeCount = await _db.Professionals
                    .CountAsync(
                        p => p.EstablishmentId == professional.EstablishmentId
                          && p.IsActive
                          && p.Id != professional.Id,
                        cancellationToken);

                if (activeCount >= limite)
                {
                    var planLabel = est?.CurrentPlan == PlanConstants.Profissional
                        ? "Profissional" : "Básico";
                    throw new InvalidOperationException(
                        $"Limite de {limite} profissional(is) ativo(s) atingido para o plano {planLabel}. " +
                        $"Desative outro profissional ou faça upgrade para o plano Profissional.");
                }
            }
        }

        professional.IsActive = !professional.IsActive;
        await _db.SaveChangesAsync(cancellationToken);
        return professional.IsActive;
    }
}
