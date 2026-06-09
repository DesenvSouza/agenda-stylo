using AgendaEstilo.Application.Auth.Commands;
using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/register", async (RegisterCommand command, IMediator mediator) =>
        {
            var id = await mediator.Send(command);
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
