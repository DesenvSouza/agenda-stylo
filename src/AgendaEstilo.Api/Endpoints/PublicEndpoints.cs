using AgendaEstilo.Application.Bookings.Commands;
using AgendaEstilo.Application.Common;
using AgendaEstilo.Application.Public.Commands;
using AgendaEstilo.Application.Public.Queries;
using AgendaEstilo.Application.Slots.Queries;
using AgendaEstilo.Infrastructure.Services;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Api.Endpoints;

public static class PublicEndpoints
{
    public static void MapPublicEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/public").WithTags("Public");

        // Página pública do estabelecimento (novo endpoint unificado)
        group.MapGet("/{slug}", async (string slug, IMediator mediator) =>
        {
            var result = await mediator.Send(new GetPublicPageQuery(slug));
            return result == null ? Results.NotFound() : Results.Ok(result);
        });

        // Agendamento público (novo endpoint com auto-profissional + jobs)
        group.MapPost("/{slug}/bookings", async (string slug, [FromBody] CreatePublicBookingCommand command, IMediator mediator) =>
        {
            var cmd = command with { Slug = slug };
            var result = await mediator.Send(cmd);
            return Results.Created($"/api/public/booking/{result.CancelToken}", result);
        });

        // Slots de disponibilidade por slug
        group.MapGet("/{slug}/slots", async (
            string slug,
            [FromQuery] Guid serviceId,
            [FromQuery] string? professionalId,
            [FromQuery] DateOnly date,
            IMediator mediator) =>
        {
            if (Guid.TryParse(professionalId, out var profId) && profId != Guid.Empty)
            {
                var result = await mediator.Send(new GetProfessionalSlotsQuery(slug, serviceId, profId, date));
                return result == null ? Results.NotFound() : Results.Ok(new[] { result });
            }
            else
            {
                var result = await mediator.Send(new GetAggregatedSlotsQuery(slug, serviceId, date));
                return Results.Ok(result);
            }
        });

        // Lookup de cliente por WhatsApp + agendamentos futuros/recentes
        group.MapGet("/{slug}/clients/lookup", async (
            string slug,
            [FromQuery] string phone,
            IAppDbContext db) =>
        {
            var norm = new string(phone.Where(char.IsDigit).ToArray());

            var est = await db.Establishments
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(e => e.Slug == slug && e.IsActive && !e.IsDeleted);

            if (est == null) return Results.NotFound();

            var client = await db.Clients
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c =>
                    c.EstablishmentId == est.Id &&
                    !c.IsDeleted &&
                    c.Phone.Replace(" ","").Replace("-","").Replace("(","").Replace(")","").Replace("+","") == norm);

            if (client == null)
                return Results.Ok(new { found = false });

            // Agendamentos futuros + últimos 30 dias
            var cutoff = DateTime.UtcNow.AddDays(-30);
            var bookings = await db.Bookings
                .IgnoreQueryFilters()
                .Include(b => b.Service)
                .Include(b => b.Professional)
                .Where(b =>
                    b.ClientId == client.Id &&
                    !b.IsDeleted &&
                    b.Status != AgendaEstilo.Domain.Enums.BookingStatus.Cancelado &&
                    b.ScheduledAt >= cutoff)
                .OrderByDescending(b => b.ScheduledAt)
                .Take(10)
                .ToListAsync();

            return Results.Ok(new
            {
                found    = true,
                clientId = client.Id,
                name     = client.Name,
                bookings = bookings.Select(b => new
                {
                    id               = b.Id,
                    serviceId        = b.ServiceId,
                    serviceName      = b.Service?.Name ?? "",
                    professionalId   = b.ProfessionalId,
                    professionalName = b.Professional?.Name ?? "",
                    scheduledAt      = b.ScheduledAt,
                    status           = (int)b.Status,
                    cancelToken      = b.CancelToken,
                }),
            });
        });

        // Cancelamento via token (GET para links de e-mail/WhatsApp)
        group.MapGet("/booking/{cancelToken}/cancel", async (string cancelToken, IMediator mediator) =>
        {
            await mediator.Send(new CancelBookingCommand(cancelToken));
            return Results.Ok(new { message = "Agendamento cancelado com sucesso." });
        });

        // Salva o reagendamento via token público
        group.MapPost("/booking/{cancelToken}/reschedule", async (
            string cancelToken,
            [FromBody] RescheduleRequest body,
            IAppDbContext db) =>
        {
            var booking = await db.Bookings
                .IgnoreQueryFilters()
                .Include(b => b.Service)
                .Where(b => b.CancelToken == cancelToken && !b.IsDeleted)
                .FirstOrDefaultAsync();

            if (booking == null) return Results.NotFound();
            if (booking.Status == AgendaEstilo.Domain.Enums.BookingStatus.Cancelado)
                return Results.BadRequest(new { message = "Agendamento já cancelado." });
            if (booking.Status == AgendaEstilo.Domain.Enums.BookingStatus.Concluido)
                return Results.BadRequest(new { message = "Agendamento já concluído." });

            // Verifica se o novo horário está disponível para o mesmo profissional
            var newStart = body.ScheduledAt.ToUniversalTime();
            var newEnd   = newStart.AddMinutes(booking.Service?.DurationMinutes ?? 30);

            var conflict = await db.Bookings
                .IgnoreQueryFilters()
                .Where(b =>
                    b.Id != booking.Id &&
                    b.ProfessionalId == booking.ProfessionalId &&
                    !b.IsDeleted &&
                    b.Status != AgendaEstilo.Domain.Enums.BookingStatus.Cancelado &&
                    b.ScheduledAt < newEnd && b.EndsAt > newStart)
                .AnyAsync();

            if (conflict) return Results.BadRequest(new { message = "Horário não disponível. Escolha outro." });

            booking.ScheduledAt = newStart;
            booking.EndsAt      = newEnd;
            booking.Status      = AgendaEstilo.Domain.Enums.BookingStatus.Confirmado;
            await db.SaveChangesAsync();

            return Results.Ok(new { scheduledAt = booking.ScheduledAt });
        });

        // Dias disponíveis no mês (verificação leve para pintar o calendário)
        group.MapGet("/{slug}/available-days", async (
            string slug,
            [FromQuery] Guid? serviceId,
            [FromQuery] Guid? professionalId,
            [FromQuery] int year,
            [FromQuery] int month,
            IMediator mediator) =>
        {
            var result = await mediator.Send(
                new GetAvailableDaysQuery(slug, serviceId, professionalId, year, month));
            return Results.Ok(result);
        });

        // Dados do booking para reagendamento
        group.MapGet("/booking/{cancelToken}/reschedule", async (string cancelToken, IAppDbContext db) =>
        {
            var booking = await db.Bookings
                .IgnoreQueryFilters()
                .Include(b => b.Service)
                .Include(b => b.Professional)
                .Include(b => b.Establishment)
                .FirstOrDefaultAsync(b => b.CancelToken == cancelToken && !b.IsDeleted);

            if (booking == null) return Results.NotFound();
            if (booking.Status == AgendaEstilo.Domain.Enums.BookingStatus.Cancelado)
                return Results.BadRequest(new { message = "Agendamento já cancelado." });

            return Results.Ok(new
            {
                bookingId = booking.Id,
                slug = booking.Establishment.Slug,
                serviceId = booking.ServiceId,
                serviceName = booking.Service.Name,
                professionalId = booking.ProfessionalId,
                professionalName = booking.Professional.Name,
                scheduledAt = booking.ScheduledAt,
            });
        });

        // Endpoints legados (mantidos para compatibilidade)
        group.MapGet("/establishments/{slug}", async (string slug, IMediator mediator) =>
        {
            var result = await mediator.Send(new GetEstablishmentBySlugQuery(slug));
            return result == null ? Results.NotFound() : Results.Ok(result);
        });

        group.MapGet("/establishments/{slug}/qrcode", async (string slug, QrCodeService qrCodeService, IConfiguration config) =>
        {
            var frontendUrl = config["FrontendUrl"] ?? "https://agendaestilo.com.br";
            var url = $"{frontendUrl}/{slug}";
            var png = qrCodeService.GeneratePng(url);
            return Results.File(png, "image/png");
        });
    }
}

file record RescheduleRequest(DateTime ScheduledAt);
