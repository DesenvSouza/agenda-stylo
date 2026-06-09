using AgendaEstilo.Application.Admin.Commands;
using AgendaEstilo.Application.Admin.Queries;
using MediatR;

namespace AgendaEstilo.Api.Endpoints;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        // ── Auth (sem autenticação prévia) ───────────────────────────────────
        var auth = app.MapGroup("/api/system/auth").WithTags("AdminAuth");

        auth.MapPost("/login", async (AdminLoginCommand cmd, IMediator mediator) =>
        {
            var result = await mediator.Send(cmd);
            return Results.Ok(result);
        });

        auth.MapPost("/refresh", async (AdminRefreshCommand cmd, IMediator mediator) =>
        {
            var result = await mediator.Send(cmd);
            return Results.Ok(result);
        });

        // ── Admin (somente Admin) ────────────────────────────────────────────
        var admin = app.MapGroup("/api/system/admin")
            .WithTags("Admin")
            .RequireAuthorization("RequireSystemAdmin");

        // Dashboard
        admin.MapGet("/summary", async (IMediator mediator) =>
        {
            var result = await mediator.Send(new GetAdminSummaryQuery());
            return Results.Ok(result);
        });

        // Relatório financeiro
        admin.MapGet("/financial/{year:int}", async (int year, IMediator mediator) =>
        {
            var result = await mediator.Send(new GetFinancialReportQuery(year));
            return Results.Ok(result);
        });

        // Estabelecimentos
        admin.MapGet("/establishments", async (
            string? search, string? category, string? plan,
            int page = 1, int pageSize = 20,
            IMediator mediator = null!) =>
        {
            var result = await mediator.Send(new ListEstablishmentsAdminQuery(search, category, plan, page, pageSize));
            return Results.Ok(result);
        });

        // Promotores
        admin.MapGet("/promoters", async (string? search, bool? activeOnly, IMediator mediator) =>
        {
            var result = await mediator.Send(new ListPromotersQuery(search, activeOnly));
            return Results.Ok(result);
        });

        admin.MapGet("/promoters/{id:guid}", async (Guid id, IMediator mediator) =>
        {
            var result = await mediator.Send(new GetPromoterStatsQuery(id));
            return Results.Ok(result);
        });

        admin.MapPost("/promoters/invite", async (InvitePromoterCommand cmd, HttpContext ctx, IMediator mediator) =>
        {
            var adminId = Guid.Parse(ctx.User.FindFirst("systemUserId")!.Value);
            var result  = await mediator.Send(cmd with { AdminId = adminId });
            return Results.Ok(result);
        });

        admin.MapPatch("/promoters/{id:guid}/commission", async (Guid id, SetCommissionBody body, IMediator mediator) =>
        {
            await mediator.Send(new SetPromoterCommissionCommand(id, body.CommissionPercent));
            return Results.NoContent();
        });

        admin.MapPatch("/promoters/{id:guid}/toggle", async (Guid id, IMediator mediator) =>
        {
            var isActive = await mediator.Send(new TogglePromoterStatusCommand(id));
            return Results.Ok(new { isActive });
        });

        // Senha do admin
        admin.MapPatch("/change-password", async (ChangePasswordBody body, HttpContext ctx, IMediator mediator) =>
        {
            var userId = Guid.Parse(ctx.User.FindFirst("systemUserId")!.Value);
            await mediator.Send(new ChangeSystemUserPasswordCommand(userId, body.CurrentPassword, body.NewPassword));
            return Results.NoContent();
        });

        // Primeiro acesso: define senha sem exigir senha atual
        admin.MapPost("/set-initial-password", async (SetInitialPasswordBody body, HttpContext ctx, IMediator mediator) =>
        {
            var userId = Guid.Parse(ctx.User.FindFirst("systemUserId")!.Value);
            await mediator.Send(new SetInitialPasswordCommand(userId, body.NewPassword));
            return Results.NoContent();
        });

        // ── Promoter (Admin e Promoter) ──────────────────────────────────────
        var promoter = app.MapGroup("/api/system/promoter")
            .WithTags("PromoterPortal")
            .RequireAuthorization("RequireSystemPromoter");

        promoter.MapGet("/stats", async (HttpContext ctx, IMediator mediator) =>
        {
            var userId = Guid.Parse(ctx.User.FindFirst("systemUserId")!.Value);
            var result = await mediator.Send(new GetPromoterStatsQuery(userId));
            return Results.Ok(result);
        });

        promoter.MapPost("/set-initial-password", async (SetInitialPasswordBody body, HttpContext ctx, IMediator mediator) =>
        {
            var userId = Guid.Parse(ctx.User.FindFirst("systemUserId")!.Value);
            await mediator.Send(new SetInitialPasswordCommand(userId, body.NewPassword));
            return Results.NoContent();
        });

        promoter.MapPatch("/change-password", async (ChangePasswordBody body, HttpContext ctx, IMediator mediator) =>
        {
            var userId = Guid.Parse(ctx.User.FindFirst("systemUserId")!.Value);
            await mediator.Send(new ChangeSystemUserPasswordCommand(userId, body.CurrentPassword, body.NewPassword));
            return Results.NoContent();
        });
    }

    private record SetCommissionBody(decimal CommissionPercent);
    private record ChangePasswordBody(string CurrentPassword, string NewPassword);
    private record SetInitialPasswordBody(string NewPassword);
}
