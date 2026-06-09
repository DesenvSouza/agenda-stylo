using AgendaEstilo.Application.Bookings.Commands;
using AgendaEstilo.Application.Bookings.Queries;
using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Api.Endpoints;

public static class BookingEndpoints
{
    public static void MapBookingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/bookings").WithTags("Bookings").RequireAuthorization();

        group.MapGet("/", async (
            [FromQuery] Guid establishmentId,
            [FromQuery] DateOnly? date,
            [FromQuery] DateOnly? dateFrom,
            [FromQuery] DateOnly? dateTo,
            [FromQuery] Guid? professionalId,
            [FromQuery] BookingStatus? status,
            [FromQuery] string? search,
            [FromQuery] int? page,
            [FromQuery] int? pageSize,
            IMediator mediator) =>
        {
            var result = await mediator.Send(new GetBookingsQuery(
                establishmentId, date, dateFrom, dateTo, professionalId, status, search,
                page is null or <= 0 ? 1 : page.Value,
                pageSize is null or <= 0 ? 50 : pageSize.Value));
            return Results.Ok(result);
        });

        group.MapGet("/{id:guid}", async (Guid id, IMediator mediator) =>
        {
            var result = await mediator.Send(new GetBookingByIdQuery(id));
            return result == null ? Results.NotFound() : Results.Ok(result);
        });

        // Slots disponíveis para uso interno (dashboard) — não exige que o horário seja futuro
        group.MapGet("/slots", async (
            [FromQuery] Guid professionalId,
            [FromQuery] Guid serviceId,
            [FromQuery] DateOnly date,
            IMediator mediator) =>
        {
            var slots = await mediator.Send(
                new GetAvailableSlotsQuery(professionalId, serviceId, date, RequireFuture: false));
            return Results.Ok(slots);
        });

        // Agendamento manual / walk-in (dashboard)
        group.MapPost("/manual", async (CreateManualBookingCommand command, IMediator mediator) =>
        {
            var result = await mediator.Send(command);
            return Results.Created($"/api/bookings/{result.BookingId}", result);
        });

        // Agendamento via CreateBookingCommand (legado)
        group.MapPost("/", async (CreateBookingCommand command, IMediator mediator) =>
        {
            var result = await mediator.Send(command);
            return Results.Created($"/api/bookings/{result.BookingId}", result);
        });

        group.MapPatch("/{id:guid}/status", async (
            Guid id, [FromBody] BookingStatus status, IMediator mediator) =>
        {
            await mediator.Send(new UpdateBookingStatusCommand(id, status));
            return Results.NoContent();
        });

        group.MapDelete("/{id:guid}", async (Guid id, IAppDbContext db) =>
        {
            var booking = await db.Bookings.FirstOrDefaultAsync(b => b.Id == id);
            if (booking == null) return Results.NotFound();
            booking.IsDeleted = true;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // ── Endpoints legados em /api/public ────────────────────────────────
        var publicGroup = app.MapGroup("/api/public").WithTags("Public");

        publicGroup.MapGet("/slots", async (
            [FromQuery] Guid professionalId,
            [FromQuery] Guid serviceId,
            [FromQuery] DateOnly date,
            IMediator mediator) =>
        {
            var slots = await mediator.Send(new GetAvailableSlotsQuery(professionalId, serviceId, date));
            return Results.Ok(slots);
        });

        publicGroup.MapPost("/bookings", async (CreateBookingCommand command, IMediator mediator) =>
        {
            var result = await mediator.Send(command);
            return Results.Created($"/api/bookings/{result.BookingId}", result);
        });

        publicGroup.MapPost("/bookings/cancel", async (
            [FromBody] CancelBookingCommand command, IMediator mediator) =>
        {
            await mediator.Send(command);
            return Results.NoContent();
        });
    }
}
