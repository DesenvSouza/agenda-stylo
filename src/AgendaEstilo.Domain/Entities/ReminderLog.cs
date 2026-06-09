using AgendaEstilo.Domain.Enums;

namespace AgendaEstilo.Domain.Entities;

public class ReminderLog : BaseEntity
{
    public Guid BookingId { get; set; }
    public ReminderType Type { get; set; }
    public ReminderChannel Channel { get; set; }
    public DateTime SentAt { get; set; }
    public bool Success { get; set; }

    public Booking Booking { get; set; } = null!;
}
