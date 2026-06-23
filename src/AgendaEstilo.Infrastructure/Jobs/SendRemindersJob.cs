using System.Globalization;
using System.Text.Json;
using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Entities;
using AgendaEstilo.Domain.Enums;
using AgendaEstilo.Domain.ValueObjects;
using AgendaEstilo.Infrastructure.Notifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AgendaEstilo.Infrastructure.Jobs;

public class SendRemindersJob
{
    private readonly IAppDbContext _db;
    private readonly IEmailService _email;
    private readonly IConfiguration _config;
    private readonly ILogger<SendRemindersJob> _logger;

    public SendRemindersJob(
        IAppDbContext db, IEmailService email,
        IConfiguration config, ILogger<SendRemindersJob> logger)
    {
        _db = db; _email = email;
        _config = config; _logger = logger;
    }

    public async Task ExecuteAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        await Send24hRemindersAsync(now, ct);
        await Send1hRemindersAsync(now, ct);
    }

    // ── 24h reminders ───────────────────────────────────────────────────────

    private async Task Send24hRemindersAsync(DateTime now, CancellationToken ct)
    {
        var from = now.AddHours(23);
        var to = now.AddHours(25);

        var bookings = await _db.Bookings
            .IgnoreQueryFilters()
            .Include(b => b.Client)
            .Include(b => b.Service)
            .Include(b => b.Professional)
            .Include(b => b.Establishment)
            .Include(b => b.ReminderLogs)
            .Where(b =>
                b.Status == BookingStatus.Confirmado &&
                !b.IsDeleted &&
                b.ScheduledAt >= from && b.ScheduledAt <= to &&
                !b.ReminderLogs.Any(r => r.Type == ReminderType.H24))
            .ToListAsync(ct);

        _logger.LogInformation("SendReminders: {Count} bookings need 24h reminder.", bookings.Count);

        foreach (var booking in bookings)
            await SendReminderAsync(booking, ReminderType.H24, ct);
    }

    // ── 1h reminders ────────────────────────────────────────────────────────

    private async Task Send1hRemindersAsync(DateTime now, CancellationToken ct)
    {
        var from = now.AddMinutes(55);
        var to = now.AddMinutes(65);

        var bookings = await _db.Bookings
            .IgnoreQueryFilters()
            .Include(b => b.Client)
            .Include(b => b.Service)
            .Include(b => b.Professional)
            .Include(b => b.Establishment)
            .Include(b => b.ReminderLogs)
            .Where(b =>
                b.Status == BookingStatus.Confirmado &&
                !b.IsDeleted &&
                b.ScheduledAt >= from && b.ScheduledAt <= to &&
                !b.ReminderLogs.Any(r => r.Type == ReminderType.H1))
            .ToListAsync(ct);

        _logger.LogInformation("SendReminders: {Count} bookings need 1h reminder.", bookings.Count);

        foreach (var booking in bookings)
            await SendReminderAsync(booking, ReminderType.H1, ct);
    }

    // ── Envio ────────────────────────────────────────────────────────────────

    private async Task SendReminderAsync(Booking booking, ReminderType type, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(booking.Client.Email))
        {
            _logger.LogDebug("Booking {BookingId}: client has no email, skipping {Type} reminder.", booking.Id, type);
            return;
        }

        var (settings, tz) = GetContext(booking.Establishment);

        if (type == ReminderType.H24 && !settings.RemindersEnabled24h) return;
        if (type == ReminderType.H1 && !settings.RemindersEnabled1h) return;

        var local = TimeZoneInfo.ConvertTimeFromUtc(booking.ScheduledAt, tz);
        var ptBR = new CultureInfo("pt-BR");
        var cancelUrl = $"{FrontendUrl()}/{booking.Establishment.Slug}/cancelar/{booking.CancelToken}";

        string html;
        string subject;

        if (type == ReminderType.H24)
        {
            html = NotificationTemplates.ClientReminder24hEmail(
                clientName: booking.Client.Name,
                serviceName: booking.Service.Name,
                time: local.ToString("HH:mm"),
                professionalName: booking.Professional.Name,
                address: booking.Establishment.Address ?? booking.Establishment.Name,
                cancelUrl: cancelUrl,
                establishmentName: booking.Establishment.Name);
            subject = $"Lembrete: {booking.Service.Name} amanhã às {local:HH:mm} — {booking.Establishment.Name}";
        }
        else
        {
            html = NotificationTemplates.ClientReminder1hEmail(
                clientName: booking.Client.Name,
                serviceName: booking.Service.Name,
                time: local.ToString("HH:mm"),
                address: booking.Establishment.Address ?? booking.Establishment.Name,
                establishmentName: booking.Establishment.Name);
            subject = $"Em 1 hora: {booking.Service.Name} às {local:HH:mm} — {booking.Establishment.Name}";
        }

        bool sent;
        try
        {
            await _email.SendAsync(booking.Client.Email, subject, html, ct);
            sent = true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Reminder email failed for booking {BookingId}", booking.Id);
            sent = false;
        }

        _db.ReminderLogs.Add(new ReminderLog
        {
            TenantId = booking.TenantId,
            BookingId = booking.Id,
            Type = type,
            Channel = ReminderChannel.Email,
            SentAt = DateTime.UtcNow,
            Success = sent
        });
        await _db.SaveChangesAsync(ct);
    }

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

    private string FrontendUrl() => _config["FrontendUrl"]?.TrimEnd('/') ?? "https://agendaestilo.com.br";
}
