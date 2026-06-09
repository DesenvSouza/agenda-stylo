namespace AgendaEstilo.Application.Common;

public interface IWhatsAppService
{
    Task<bool> SendMessageAsync(string phone, string message, CancellationToken ct = default);
}
