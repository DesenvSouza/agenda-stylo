namespace AgendaEstilo.Domain.Entities;

public class Client : BaseEntity
{
    public Guid EstablishmentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Notes { get; set; }
    public int VisitCount { get; set; }
    public DateTime? LastVisitAt { get; set; }

    public Establishment Establishment { get; set; } = null!;
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}
