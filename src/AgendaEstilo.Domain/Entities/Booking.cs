using AgendaEstilo.Domain.Enums;

namespace AgendaEstilo.Domain.Entities;

public class Booking : BaseEntity
{
    public Guid EstablishmentId { get; set; }
    public Guid ProfessionalId { get; set; }
    public Guid ServiceId { get; set; }
    public Guid ClientId { get; set; }
    public DateTime ScheduledAt { get; set; }
    public DateTime EndsAt { get; set; }
    public BookingStatus Status { get; set; } = BookingStatus.Pendente;
    public BookingSource Source { get; set; } = BookingSource.Online;
    public string CancelToken { get; set; } = Guid.NewGuid().ToString("N");
    public string? Notes { get; set; }

    public Establishment Establishment { get; set; } = null!;
    public Professional Professional { get; set; } = null!;
    public Service Service { get; set; } = null!;
    public Client Client { get; set; } = null!;
    public ICollection<ReminderLog> ReminderLogs { get; set; } = new List<ReminderLog>();
}
