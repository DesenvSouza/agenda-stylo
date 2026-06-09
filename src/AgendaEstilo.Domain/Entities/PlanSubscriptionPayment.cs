namespace AgendaEstilo.Domain.Entities;

/// <summary>Registro de pagamento de plano de um estabelecimento.</summary>
public class PlanSubscriptionPayment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EstablishmentId { get; set; }
    public Guid TenantId { get; set; }

    /// <summary>Nome do plano no momento do pagamento (ex: "Básico", "Profissional", "Premium").</summary>
    public string Plan { get; set; } = "";

    public decimal Amount { get; set; }

    /// <summary>ID externo do pagamento (gateway, ex: Asaas, Stripe).</summary>
    public string? ExternalPaymentId { get; set; }

    public DateTime PaidAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Establishment Establishment { get; set; } = null!;
}
