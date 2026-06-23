using System.Text.Json;
using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.ValueObjects;
using AgendaEstilo.Infrastructure.Notifications;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Api.Endpoints;

public static class NotificationSettingsEndpoints
{
    public static void MapNotificationSettingsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/settings/notifications")
            .WithTags("Settings")
            .RequireAuthorization();

        group.MapGet("/", async (HttpContext ctx, IAppDbContext db) =>
        {
            var eid = ctx.User.FindFirst("eid")?.Value;
            if (!Guid.TryParse(eid, out var estId)) return Results.Unauthorized();
            var establishment = await db.Establishments
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(e => e.Id == estId && !e.IsDeleted);
            if (establishment == null) return Results.NotFound();

            var settings = Deserialize(establishment.NotificationSettingsJson);
            return Results.Ok(new
            {
                settings,
                contactEmail = establishment.ContactEmail,
            });
        });

        group.MapPut("/", async (
            HttpContext ctx,
            [FromBody] UpdateNotificationSettingsRequest request,
            IAppDbContext db) =>
        {
            var eid = ctx.User.FindFirst("eid")?.Value;
            if (!Guid.TryParse(eid, out var estId)) return Results.Unauthorized();
            var establishment = await db.Establishments
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(e => e.Id == estId && !e.IsDeleted);
            if (establishment == null) return Results.NotFound();

            establishment.NotificationSettingsJson = JsonSerializer.Serialize(request.Settings);
            establishment.ContactEmail = request.ContactEmail;
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Configurações salvas." });
        });

        group.MapPost("/test", async (
            HttpContext ctx,
            [FromBody] TestEmailRequest request,
            IAppDbContext db,
            IEmailService email) =>
        {
            var eid = ctx.User.FindFirst("eid")?.Value;
            if (!Guid.TryParse(eid, out var estId)) return Results.Unauthorized();

            var establishment = await db.Establishments
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(e => e.Id == estId && !e.IsDeleted);
            if (establishment == null) return Results.NotFound();

            var to = request.Email?.Trim();
            if (string.IsNullOrEmpty(to))
                return Results.BadRequest(new { message = "Informe um e-mail para o teste." });

            var html = NotificationTemplates.TestEmail(establishment.Name);
            await email.SendAsync(to, "Teste de notificação — AgendaEstilo", html);

            return Results.Ok(new { message = $"E-mail de teste enviado para {to}." });
        });
    }

    private static NotificationSettings Deserialize(string? json)
    {
        if (string.IsNullOrEmpty(json)) return NotificationSettings.Default;
        try { return JsonSerializer.Deserialize<NotificationSettings>(json) ?? NotificationSettings.Default; }
        catch { return NotificationSettings.Default; }
    }
}

public record UpdateNotificationSettingsRequest(NotificationSettings Settings, string? ContactEmail);
public record TestEmailRequest(string? Email);
