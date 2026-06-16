using AgendaEstilo.Application.Announcements.Commands;
using AgendaEstilo.Application.Announcements.Queries;
using MediatR;

namespace AgendaEstilo.Api.Endpoints;

public static class AnnouncementEndpoints
{
    public static void MapAnnouncementEndpoints(this IEndpointRouteBuilder app)
    {
        // ── Dashboard: comunicados ativos para o tenant autenticado ────────────
        var pub = app.MapGroup("/api/announcements")
            .WithTags("Announcements")
            .RequireAuthorization();

        pub.MapGet("/active", async (IMediator mediator) =>
        {
            var result = await mediator.Send(new GetActiveAnnouncementsQuery());
            return Results.Ok(result);
        });

        // ── Admin: CRUD completo de comunicados ────────────────────────────────
        var admin = app.MapGroup("/api/system/admin/announcements")
            .WithTags("AdminAnnouncements")
            .RequireAuthorization("RequireSystemAdmin");

        admin.MapGet("/", async (IMediator mediator) =>
        {
            var result = await mediator.Send(new ListAnnouncementsQuery());
            return Results.Ok(result);
        });

        admin.MapPost("/", async (UpsertAnnouncementCommand cmd, IMediator mediator) =>
        {
            var result = await mediator.Send(cmd);
            return Results.Ok(result);
        });

        admin.MapPut("/{id:guid}", async (Guid id, UpsertAnnouncementBody body, IMediator mediator) =>
        {
            var cmd = new UpsertAnnouncementCommand(
                id,
                body.Title,
                body.Body,
                body.Severity,
                body.Target,
                body.StartsAt,
                body.EndsAt,
                body.ActionLabel,
                body.ActionUrl,
                body.IsDismissible,
                body.IsActive
            );
            var result = await mediator.Send(cmd);
            return Results.Ok(result);
        });

        admin.MapDelete("/{id:guid}", async (Guid id, IMediator mediator) =>
        {
            await mediator.Send(new DeleteAnnouncementCommand(id));
            return Results.NoContent();
        });
    }

    private record UpsertAnnouncementBody(
        string   Title,
        string   Body,
        string   Severity,
        string   Target,
        DateTime StartsAt,
        DateTime EndsAt,
        string?  ActionLabel,
        string?  ActionUrl,
        bool     IsDismissible,
        bool     IsActive
    );
}
