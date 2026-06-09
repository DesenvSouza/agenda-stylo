using AgendaEstilo.Domain.Enums;

namespace AgendaEstilo.Domain.Entities;

public class Service : BaseEntity
{
    public Guid EstablishmentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Category { get; set; }
    public int DurationMinutes { get; set; }
    public decimal Price { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public int Order { get; set; }

    /// <summary>Tipo de comissão cobrada pelo estabelecimento sobre este serviço.</summary>
    public CommissionType CommissionType { get; set; } = CommissionType.None;
    /// <summary>Valor da comissão: percentual (0–100) se Percentage, ou valor fixo em R$ se Fixed.</summary>
    public decimal CommissionValue { get; set; } = 0;

    public Establishment Establishment { get; set; } = null!;
    public ICollection<ProfessionalService> ProfessionalServices { get; set; } = new List<ProfessionalService>();
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}
