using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Interfaces;
using Hangfire;

namespace AgendaEstilo.Infrastructure.Services;

public class NotificationJobService : INotificationJobService
{
    private readonly IBackgroundJobClient _jobs;

    public NotificationJobService(IBackgroundJobClient jobs) => _jobs = jobs;

    public void EnqueueWhatsApp(string phone, string message) =>
        _jobs.Enqueue<INotificationService>(svc =>
            svc.SendWhatsAppAsync(phone, message, CancellationToken.None));

    public void ScheduleWhatsApp(string phone, string message, DateTimeOffset executeAt) =>
        _jobs.Schedule<INotificationService>(svc =>
            svc.SendWhatsAppAsync(phone, message, CancellationToken.None), executeAt);
}
