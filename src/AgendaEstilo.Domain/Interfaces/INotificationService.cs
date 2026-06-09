using AgendaEstilo.Domain.Enums;

namespace AgendaEstilo.Domain.Interfaces;

public interface INotificationService
{
    Task SendWhatsAppAsync(string phone, string message, CancellationToken cancellationToken = default);
    Task SendEmailAsync(string email, string subject, string body, CancellationToken cancellationToken = default);
}
