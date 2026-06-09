namespace AgendaEstilo.Application.Common;

public interface IBookingNotificationService
{
    /// <summary>Enfileira job de confirmação imediata (fire-and-forget via Hangfire).</summary>
    void EnqueueConfirmation(Guid bookingId);

    /// <summary>Enfileira job de notificação de cancelamento.</summary>
    void EnqueueCancellation(Guid bookingId);
    void EnqueueThankYou(Guid bookingId);

    // Chamados pelo próprio Hangfire — public para serialização da expressão
    Task SendConfirmationAsync(Guid bookingId, CancellationToken ct);
    Task SendCancellationAsync(Guid bookingId, CancellationToken ct);
    Task SendThankYouAsync(Guid bookingId, CancellationToken ct);
}
