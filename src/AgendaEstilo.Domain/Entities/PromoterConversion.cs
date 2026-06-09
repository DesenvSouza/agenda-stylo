namespace AgendaEstilo.Domain.Entities;

/// <summary>Registra que um promotor indicou um estabelecimento e tem comissão a receber.</summary>
public class PromoterConversion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PromoterId { get; set; }
    public Guid EstablishmentId { get; set; }
    public Guid TenantId { get; set; }

    /// <summary>Plano no momento da conversão.</summary>
    public string Plan { get; set; } = "Gratuito";

    public decimal PlanAmount { get; set; }
    public decimal CommissionAmount { get; set; }

    public DateTime ConvertedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public SystemUser Promoter { get; set; } = null!;
    public Establishment Establishment { get; set; } = null!;
}
