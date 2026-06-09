using AgendaEstilo.Application.Clients.Commands;
using AgendaEstilo.Application.Clients.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AgendaEstilo.Api.Endpoints;

public static class ClientEndpoints
{
    public static void MapClientEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/clients").WithTags("Clients").RequireAuthorization();

        group.MapGet("/", async (
            [FromQuery] Guid establishmentId,
            [FromQuery] string? search,
            [FromQuery] int? page,
            [FromQuery] int? pageSize,
            IMediator mediator) =>
        {
            var result = await mediator.Send(new GetClientsQuery(establishmentId, search,
                page is null or <= 0 ? 1 : page.Value,
                pageSize is null or <= 0 ? 20 : pageSize.Value));
            return Results.Ok(result);
        });

        group.MapGet("/{id:guid}", async (Guid id, IMediator mediator) =>
        {
            var result = await mediator.Send(new GetClientByIdQuery(id));
            return result == null ? Results.NotFound() : Results.Ok(result);
        });

        group.MapPut("/{id:guid}", async (Guid id, [FromBody] UpdateClientRequest body, IMediator mediator) =>
        {
            await mediator.Send(new UpdateClientCommand(id, body.Notes, body.Email));
            return Results.NoContent();
        });

        group.MapGet("/{id:guid}/bookings", async (
            Guid id,
            [FromQuery] int? page,
            [FromQuery] int? pageSize,
            IMediator mediator) =>
        {
            var result = await mediator.Send(new GetClientBookingsQuery(id,
                page is null or <= 0 ? 1 : page.Value,
                pageSize is null or <= 0 ? 20 : pageSize.Value));
            return Results.Ok(result);
        });
    }
}

public record UpdateClientRequest(string? Notes, string? Email);
