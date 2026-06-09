using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Constants;
using AgendaEstilo.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Admin.Commands;

/// <summary>
/// Ativa um plano para um estabelecimento (uso pelo painel admin).
/// Cria um registro de pagamento manual e atualiza o plano no estabelecimento.
/// </summary>
public record ActivatePlanCommand(
    Guid   EstablishmentId,
    string Plan,
    string? ExternalPaymentId = null
) : IRequest<ActivatePlanResult>;

public record ActivatePlanResult(
    Guid   PaymentId,
    string Plan,
    decimal Amount
);

public class ActivatePlanCommandHandler : IRequestHandler<ActivatePlanCommand, ActivatePlanResult>
{
    private readonly IAppDbContext _db;

    public ActivatePlanCommandHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<ActivatePlanResult> Handle(ActivatePlanCommand request, CancellationToken cancellationToken)
    {
        if (!PlanConstants.IsValid(request.Plan))
            throw new ArgumentException($"Plano inválido: '{request.Plan}'. Use 'Basico' ou 'Profissional'.");

        var est = await _db.Establishments
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(e => e.Id == request.EstablishmentId && !e.IsDeleted, cancellationToken)
            ?? throw new KeyNotFoundException("Estabelecimento não encontrado.");

        var amount = PlanConstants.GetPreco(request.Plan);

        // Registrar pagamento
        var payment = new PlanSubscriptionPayment
        {
            Id                = Guid.NewGuid(),
            EstablishmentId   = est.Id,
            TenantId          = est.TenantId,
            Plan              = request.Plan,
            Amount            = amount,
            ExternalPaymentId = request.ExternalPaymentId,
            PaidAt            = DateTime.UtcNow,
            CreatedAt         = DateTime.UtcNow,
        };
        _db.PlanSubscriptionPayments.Add(payment);

        // Atualizar plano no estabelecimento
        est.CurrentPlan    = request.Plan;
        est.PlanExpiresAt  = null;   // Sem expiração para ativações manuais

        await _db.SaveChangesAsync(cancellationToken);

        return new ActivatePlanResult(payment.Id, request.Plan, amount);
    }
}
