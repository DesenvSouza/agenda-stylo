namespace AgendaEstilo.Application.Common;

public interface INotificationJobService
{
    void EnqueueWhatsApp(string phone, string message);
    void ScheduleWhatsApp(string phone, string message, DateTimeOffset executeAt);
}
