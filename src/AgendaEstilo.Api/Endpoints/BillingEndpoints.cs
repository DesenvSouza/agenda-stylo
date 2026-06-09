using AgendaEstilo.Application.Billing.Queries;
using MediatR;

namespace AgendaEstilo.Api.Endpoints;

public static class BillingEndpoints
{
    public static void MapBillingEndpoints(this IEndpointRouteBuilder app)
    {
        var billing = app.MapGroup("/api/billing")
            .WithTags("Billing")
            .RequireAuthorization();

        // Status do plano do estabelecimento logado
        billing.MapGet("/status", async (IMediator mediator) =>
        {
            var result = await mediator.Send(new GetPlanStatusQuery());
            return Results.Ok(result);
        });
    }
}
