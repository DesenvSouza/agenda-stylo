using AgendaEstilo.Application.Auth.Commands;
using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Interfaces;
using AgendaEstilo.Infrastructure.Notifications;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace AgendaEstilo.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/register", async (
            RegisterCommand command,
            IMediator mediator,
            IEmailService email,
            IConfiguration config) =>
        {
            var id = await mediator.Send(command);

            // E-mail de boas-vindas (falha silenciosa — cadastro já está salvo)
            _ = Task.Run(async () =>
            {
                try
                {
                    var loginUrl = $"{config["FrontendUrl"]?.TrimEnd('/') ?? "https://agendaestilo.com.br"}/login";
                    var html = NotificationTemplates.Welcome(command.EstablishmentName, command.Email, loginUrl);
                    await email.SendAsync(command.Email, $"Bem-vindo ao AgendaEstilo, {command.EstablishmentName}!", html);
                }
                catch { /* silencia */ }
            });

            return Results.Created($"/api/auth/{id}", new { id });
        });

        group.MapPost("/login", async (LoginCommand command, IMediator mediator) =>
        {
            var result = await mediator.Send(command);
            return Results.Ok(result);
        });

        // Retorna o slug do estabelecimento do usuário autenticado (fallback do frontend)
        app.MapGet("/api/establishments/my-slug", async (IAppDbContext db) =>
        {
            // O global query filter já filtra pelo TenantId do JWT
            var slug = await db.Establishments
                .Select(e => e.Slug)
                .FirstOrDefaultAsync();

            return slug == null ? Results.NotFound() : Results.Ok(new { slug });
        }).RequireAuthorization();
    }
}
