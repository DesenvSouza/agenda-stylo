using System.Text.Json;
using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.ValueObjects;
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
            [FromBody] TestWhatsAppRequest request,
            IWhatsAppService whatsApp) =>
        {
            var msg = "🔔 Teste de notificação do AgendaEstilo. Se recebeu esta mensagem, a integração está funcionando! ✅";
            var sent = await whatsApp.SendMessageAsync(request.Phone, msg);
            return sent
                ? Results.Ok(new { message = "Mensagem enviada com sucesso!" })
                : Results.BadRequest(new { message = "Falha ao enviar. Verifique as configurações da Evolution API." });
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
public record TestWhatsAppRequest(string Phone);
