using AgendaEstilo.Application.Bookings.Queries;
using AgendaEstilo.Application.Dashboard.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AgendaEstilo.Api.Endpoints;

public static class DashboardEndpoints
{
    public static void MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/dashboard").WithTags("Dashboard").RequireAuthorization();

        group.MapGet("/today", async ([FromQuery] Guid establishmentId, IMediator mediator) =>
        {
            var result = await mediator.Send(new GetDashboardTodayQuery(establishmentId));
            return Results.Ok(result);
        });

        group.MapGet("/week", async (
            [FromQuery] Guid establishmentId,
            [FromQuery] DateOnly? startDate,
            IMediator mediator) =>
        {
            var start = startDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var result = await mediator.Send(new GetBookingsWeekQuery(establishmentId, start));
            return Results.Ok(result);
        });
    }
}
