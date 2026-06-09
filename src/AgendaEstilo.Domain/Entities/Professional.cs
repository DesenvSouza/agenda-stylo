namespace AgendaEstilo.Domain.Entities;

public class Professional : BaseEntity
{
    public Guid EstablishmentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public string? Specialty { get; set; }
    public string? Bio { get; set; }
    public bool IsActive { get; set; } = true;
    public int Order { get; set; }
    /// <summary>CPF do profissional (apenas dígitos).</summary>
    public string? Cpf { get; set; }
    /// <summary>WhatsApp do profissional (apenas dígitos, ex: 5531999999999).</summary>
    public string? WhatsApp { get; set; }

    public Establishment Establishment { get; set; } = null!;
    public ICollection<ProfessionalService> ProfessionalServices { get; set; } = new List<ProfessionalService>();
    public ICollection<Availability> Availabilities { get; set; } = new List<Availability>();
    public ICollection<BlockedSlot> BlockedSlots { get; set; } = new List<BlockedSlot>();
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}
