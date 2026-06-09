using AgendaEstilo.Application.Services.Commands;
using AgendaEstilo.Application.Services.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AgendaEstilo.Api.Endpoints;

public static class ServiceEndpoints
{
    public static void MapServiceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/services").WithTags("Services").RequireAuthorization();

        group.MapGet("/", async ([FromQuery] Guid establishmentId, IMediator mediator) =>
        {
            var result = await mediator.Send(new GetServicesQuery(establishmentId));
            return Results.Ok(result);
        });

        group.MapPost("/", async (UpsertServiceCommand command, IMediator mediator) =>
        {
            var id = await mediator.Send(command);
            return Results.Ok(new { id });
        });

        group.MapPut("/{id:guid}", async (Guid id, UpsertServiceCommand command, IMediator mediator) =>
        {
            var result = await mediator.Send(command with { Id = id });
            return Results.Ok(new { id = result });
        });

        group.MapPatch("/{id:guid}/toggle-active", async (Guid id, IMediator mediator) =>
        {
            var isActive = await mediator.Send(new ToggleServiceActiveCommand(id));
            return Results.Ok(new { isActive });
        });

        group.MapDelete("/{id:guid}", async (Guid id, IMediator mediator) =>
        {
            await mediator.Send(new DeleteServiceCommand(id));
            return Results.NoContent();
        });
    }
}
