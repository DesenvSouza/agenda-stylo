namespace AgendaEstilo.Domain.ValueObjects;

public class NotificationSettings
{
    public bool RemindersEnabled24h { get; set; } = true;
    public bool RemindersEnabled1h { get; set; } = true;
    public bool NotifyClientCancellation { get; set; } = true;
    public bool NotifyProfessionalNewBooking { get; set; } = true;
    public bool NotifyProfessionalCancellation { get; set; } = false;

    public static NotificationSettings Default => new();
}
