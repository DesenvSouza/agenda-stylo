using AgendaEstilo.Application.Reports.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AgendaEstilo.Api.Endpoints;

public static class ReportEndpoints
{
    public static void MapReportEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/reports").WithTags("Reports").RequireAuthorization();

        group.MapGet("/revenue", async (
            [FromQuery] Guid establishmentId,
            [FromQuery] string period,
            [FromQuery] DateOnly date,
            IMediator mediator) =>
        {
            var result = await mediator.Send(new GetRevenueReportQuery(establishmentId, period, date));
            return Results.Ok(result);
        });

        group.MapGet("/bookings", async (
            [FromQuery] Guid establishmentId,
            [FromQuery] string period,
            [FromQuery] DateOnly date,
            IMediator mediator) =>
        {
            var result = await mediator.Send(new GetBookingsReportQuery(establishmentId, period, date));
            return Results.Ok(result);
        });

        group.MapGet("/professionals", async (
            [FromQuery] Guid establishmentId,
            [FromQuery] DateOnly dateFrom,
            [FromQuery] DateOnly dateTo,
            IMediator mediator) =>
        {
            var result = await mediator.Send(
                new GetProfessionalCommissionsReportQuery(establishmentId, dateFrom, dateTo));
            return Results.Ok(result);
        });

        group.MapGet("/clients", async (
            [FromQuery] Guid establishmentId,
            [FromQuery] string period,
            [FromQuery] DateOnly? date,
            [FromQuery] string? sortBy,
            [FromQuery] int? top,
            IMediator mediator) =>
        {
            var result = await mediator.Send(new GetTopClientsQuery(
                establishmentId,
                period ?? "all",
                date,
                sortBy ?? "visits",
                top is null or <= 0 ? 20 : top.Value));
            return Results.Ok(result);
        });

        group.MapGet("/top-professionals", async (
            [FromQuery] Guid establishmentId,
            [FromQuery] string period,
            [FromQuery] DateOnly? date,
            [FromQuery] string? sortBy,
            [FromQuery] int? top,
            IMediator mediator) =>
        {
            var result = await mediator.Send(new GetTopProfessionalsQuery(
                establishmentId,
                period ?? "all",
                date,
                sortBy ?? "services",
                top is null or <= 0 ? 20 : top.Value));
            return Results.Ok(result);
        });
    }
}
