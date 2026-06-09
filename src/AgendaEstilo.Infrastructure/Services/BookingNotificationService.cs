using System.Globalization;
using System.Text.Json;
using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Entities;
using AgendaEstilo.Domain.Enums;
using AgendaEstilo.Domain.ValueObjects;
using AgendaEstilo.Infrastructure.Notifications;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AgendaEstilo.Infrastructure.Services;

public class BookingNotificationService : IBookingNotificationService
{
    private readonly IAppDbContext _db;
    private readonly IWhatsAppService _whatsApp;
    private readonly IEmailService _email;
    private readonly IBackgroundJobClient _jobs;
    private readonly IConfiguration _config;
    private readonly ILogger<BookingNotificationService> _logger;

    public BookingNotificationService(
        IAppDbContext db, IWhatsAppService whatsApp, IEmailService email,
        IBackgroundJobClient jobs, IConfiguration config,
        ILogger<BookingNotificationService> logger)
    {
        _db = db; _whatsApp = whatsApp; _email = email;
        _jobs = jobs; _config = config; _logger = logger;
    }

    // ── Enqueue (chamado pelos command handlers) ────────────────────────────

    public void EnqueueConfirmation(Guid bookingId) =>
        _jobs.Enqueue<IBookingNotificationService>(
            svc => svc.SendConfirmationAsync(bookingId, CancellationToken.None));

    public void EnqueueCancellation(Guid bookingId) =>
        _jobs.Enqueue<IBookingNotificationService>(
            svc => svc.SendCancellationAsync(bookingId, CancellationToken.None));

    public void EnqueueThankYou(Guid bookingId) =>
        _jobs.Enqueue<IBookingNotificationService>(
            svc => svc.SendThankYouAsync(bookingId, CancellationToken.None));

    // ── Executados pelo Hangfire ────────────────────────────────────────────

    public async Task SendConfirmationAsync(Guid bookingId, CancellationToken ct)
    {
        var booking = await LoadBooking(bookingId, ct);
        if (booking == null) return;

        var (settings, tz) = GetContext(booking.Establishment);
        var local = TimeZoneInfo.ConvertTimeFromUtc(booking.ScheduledAt, tz);
        var ptBR = new CultureInfo("pt-BR");

        var cancelUrl = BuildCancelUrl(booking);
        var estabUrl = $"{FrontendUrl()}/{booking.Establishment.Slug}";

        // Mensagem para o cliente
        var clientMsg = NotificationTemplates.ClientConfirmation(
            clientName: booking.Client.Name,
            serviceName: booking.Service.Name,
            professionalName: booking.Professional.Name,
            dayOfWeek: local.ToString("dddd", ptBR),
            date: local.ToString("dd/MM/yyyy"),
            time: local.ToString("HH:mm"),
            address: booking.Establishment.Address ?? booking.Establishment.Name,
            cancelUrl: cancelUrl,
            establishmentName: booking.Establishment.Name);

        var sent = await _whatsApp.SendMessageAsync(booking.Client.Phone, clientMsg, ct);
        if (!sent && settings.EmailFallbackEnabled && !string.IsNullOrEmpty(booking.Establishment.ContactEmail))
            await _email.SendAsync(booking.Establishment.ContactEmail, "Confirmação de agendamento", clientMsg, ct);

        await LogReminder(booking, ReminderType.Confirmation, sent ? ReminderChannel.WhatsApp : ReminderChannel.Email, sent, ct);

        // Mensagem para o profissional
        if (settings.NotifyProfessionalNewBooking)
            await NotifyProfessional(booking, local, ptBR, ct);
    }

    public async Task SendCancellationAsync(Guid bookingId, CancellationToken ct)
    {
        var booking = await LoadBooking(bookingId, ct);
        if (booking == null) return;

        var (settings, tz) = GetContext(booking.Establishment);
        if (!settings.NotifyClientCancellation) return;

        var local = TimeZoneInfo.ConvertTimeFromUtc(booking.ScheduledAt, tz);
        var estabUrl = $"{FrontendUrl()}/{booking.Establishment.Slug}";

        var msg = NotificationTemplates.ClientCancellation(
            clientName: booking.Client.Name,
            serviceName: booking.Service.Name,
            date: local.ToString("dd/MM/yyyy"),
            time: local.ToString("HH:mm"),
            establishmentUrl: estabUrl,
            establishmentName: booking.Establishment.Name);

        var sent = await _whatsApp.SendMessageAsync(booking.Client.Phone, msg, ct);
        await LogReminder(booking, ReminderType.Cancellation, sent ? ReminderChannel.WhatsApp : ReminderChannel.Email, sent, ct);
    }

    public async Task SendThankYouAsync(Guid bookingId, CancellationToken ct)
    {
        var booking = await LoadBooking(bookingId, ct);
        if (booking == null) return;

        var estabUrl = $"{FrontendUrl()}/{booking.Establishment.Slug}";
        var msg = NotificationTemplates.ClientThankYou(
            booking.Client.Name, booking.Service.Name,
            booking.Establishment.Name, estabUrl);

        var sent = await _whatsApp.SendMessageAsync(booking.Client.Phone, msg, ct);
        await LogReminder(booking, ReminderType.Confirmation, sent ? ReminderChannel.WhatsApp : ReminderChannel.Email, sent, ct);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private async Task NotifyProfessional(
        Booking booking, DateTime localTime, CultureInfo ptBR, CancellationToken ct)
    {
        var profUser = await _db.Users
            .IgnoreQueryFilters()
            .Where(u => u.ProfessionalId == booking.ProfessionalId && !u.IsDeleted)
            .Select(u => u.Email)
            .FirstOrDefaultAsync(ct);

        if (profUser == null) return;

        var html = NotificationTemplates.ProfessionalNewBookingEmail(
            serviceName: booking.Service.Name,
            clientName: booking.Client.Name,
            dayOfWeek: localTime.ToString("dddd", ptBR),
            date: localTime.ToString("dd/MM/yyyy"),
            time: localTime.ToString("HH:mm"),
            clientPhone: booking.Client.Phone);

        await _email.SendAsync(profUser,
            $"Novo agendamento: {booking.Service.Name} com {booking.Client.Name}", html, ct);
    }

    private async Task<Booking?> LoadBooking(Guid bookingId, CancellationToken ct) =>
        await _db.Bookings
            .IgnoreQueryFilters()
            .Include(b => b.Client)
            .Include(b => b.Service)
            .Include(b => b.Professional)
            .Include(b => b.Establishment)
            .FirstOrDefaultAsync(b => b.Id == bookingId && !b.IsDeleted, ct);

    private static (NotificationSettings Settings, TimeZoneInfo Tz) GetContext(Establishment e)
    {
        NotificationSettings settings;
        try
        {
            settings = string.IsNullOrEmpty(e.NotificationSettingsJson)
                ? NotificationSettings.Default
                : JsonSerializer.Deserialize<NotificationSettings>(e.NotificationSettingsJson)
                  ?? NotificationSettings.Default;
        }
        catch { settings = NotificationSettings.Default; }

        TimeZoneInfo tz;
        try { tz = TimeZoneInfo.FindSystemTimeZoneById(e.TimeZoneId ?? "America/Sao_Paulo"); }
        catch { tz = TimeZoneInfo.Utc; }

        return (settings, tz);
    }

    private async Task LogReminder(
        Booking booking, ReminderType type, ReminderChannel channel, bool success, CancellationToken ct)
    {
        _db.ReminderLogs.Add(new ReminderLog
        {
            TenantId = booking.TenantId,
            BookingId = booking.Id,
            Type = type,
            Channel = channel,
            SentAt = DateTime.UtcNow,
            Success = success
        });
        await _db.SaveChangesAsync(ct);
    }

    private string BuildCancelUrl(Booking booking) =>
        $"{FrontendUrl()}/{booking.Establishment.Slug}/cancelar/{booking.CancelToken}";

    private string FrontendUrl() =>
        _config["FrontendUrl"]?.TrimEnd('/') ?? "https://agendaestilo.com.br";
}
