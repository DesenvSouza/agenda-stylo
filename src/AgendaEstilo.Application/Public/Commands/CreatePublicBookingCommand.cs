using System.Data;
using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Entities;
using AgendaEstilo.Domain.Enums;
using AgendaEstilo.Domain.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Public.Commands;

public record PublicBookingClientDto(string Name, string Phone, string? Email);

public record CreatePublicBookingCommand(
    string Slug,
    Guid ServiceId,
    Guid? ProfessionalId,
    DateTime ScheduledAt,
    PublicBookingClientDto Client) : IRequest<PublicBookingResultDto>;

public record PublicBookingResultDto(
    Guid BookingId,
    string ConfirmationCode,
    string CancelToken,
    PublicBookingProfessionalDto Professional,
    DateTime ScheduledAt,
    PublicBookingServiceDto Service);

public record PublicBookingProfessionalDto(string Name, string? PhotoUrl);
public record PublicBookingServiceDto(string Name, int DurationMinutes);

public class CreatePublicBookingCommandHandler
    : IRequestHandler<CreatePublicBookingCommand, PublicBookingResultDto>
{
    private readonly IAppDbContext _db;
    private readonly IBookingNotificationService _notifications;

    public CreatePublicBookingCommandHandler(IAppDbContext db, IBookingNotificationService notifications)
        => (_db, _notifications) = (db, notifications);

    public async Task<PublicBookingResultDto> Handle(
        CreatePublicBookingCommand request, CancellationToken ct)
    {
        var establishment = await _db.Establishments
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(e => e.Slug == request.Slug && e.IsActive && !e.IsDeleted, ct)
            ?? throw new KeyNotFoundException("Estabelecimento não encontrado.");

        var service = await _db.Services
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.Id == request.ServiceId && s.EstablishmentId == establishment.Id, ct)
            ?? throw new KeyNotFoundException("Serviço não encontrado.");

        var scheduledAt = request.ScheduledAt.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(request.ScheduledAt, DateTimeKind.Utc)
            : request.ScheduledAt.ToUniversalTime();

        var ps = request.ProfessionalId.HasValue
            ? await _db.ProfessionalServices.IgnoreQueryFilters()
                .Include(x => x.Professional)
                .FirstOrDefaultAsync(x =>
                    x.ProfessionalId == request.ProfessionalId &&
                    x.ServiceId == service.Id &&
                    x.Professional.EstablishmentId == establishment.Id &&
                    x.Professional.IsActive, ct)
            : null;

        var durationMinutes = ps?.CustomDuration ?? service.DurationMinutes;
        var endsAt = scheduledAt.AddMinutes(durationMinutes);
        var date = DateOnly.FromDateTime(scheduledAt);

        Guid selectedProfId;
        if (request.ProfessionalId.HasValue)
        {
            if (ps == null) throw new KeyNotFoundException("Profissional não encontrado.");
            selectedProfId = request.ProfessionalId.Value;
        }
        else
        {
            selectedProfId = await SelectAvailableProfessionalAsync(
                establishment.Id, service.Id, scheduledAt, endsAt, date, ct);
        }

        var professional = await _db.Professionals
            .IgnoreQueryFilters()
            .FirstAsync(p => p.Id == selectedProfId, ct);

        await using var tx = await _db.BeginSerializableTransactionAsync(ct);

        // IgnoreQueryFilters é obrigatório aqui: a requisição pública não tem JWT,
        // então _tenantService.TenantId == Guid.Empty e o filtro global excluiria
        // todos os bookings reais, tornando o check de conflito sempre falso.
        var conflict = await _db.Bookings
            .IgnoreQueryFilters()
            .AnyAsync(b =>
                b.ProfessionalId == selectedProfId &&
                !b.IsDeleted &&
                b.Status != BookingStatus.Cancelado &&
                b.Status != BookingStatus.NaoCompareceu &&
                b.ScheduledAt < endsAt &&
                b.EndsAt > scheduledAt, ct);

        if (conflict) throw new BookingConflictException();

        var client = await _db.Clients
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c =>
                c.Phone == request.Client.Phone &&
                c.EstablishmentId == establishment.Id &&
                !c.IsDeleted, ct);

        if (client == null)
        {
            client = new Client
            {
                TenantId = establishment.TenantId,
                EstablishmentId = establishment.Id,
                Name = request.Client.Name,
                Phone = request.Client.Phone,
                Email = request.Client.Email,
                VisitCount = 0
            };
            _db.Clients.Add(client);
        }
        else
        {
            client.Name = request.Client.Name;
            if (request.Client.Email != null) client.Email = request.Client.Email;
        }
        // VisitCount e LastVisitAt só são atualizados ao marcar o agendamento
        // como Concluído (UpdateBookingStatusCommand) — não na criação.

        var booking = new Booking
        {
            TenantId = establishment.TenantId,
            EstablishmentId = establishment.Id,
            ProfessionalId = selectedProfId,
            ServiceId = service.Id,
            Client = client,
            ScheduledAt = scheduledAt,
            EndsAt = endsAt,
            Source = BookingSource.Online,
            Status = BookingStatus.Confirmado,
        };

        _db.Bookings.Add(booking);
        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        _notifications.EnqueueConfirmation(booking.Id);

        return new PublicBookingResultDto(
            booking.Id,
            booking.CancelToken[..8].ToUpper(),
            booking.CancelToken,
            new PublicBookingProfessionalDto(professional.Name, professional.PhotoUrl),
            scheduledAt,
            new PublicBookingServiceDto(service.Name, durationMinutes));
    }

    private async Task<Guid> SelectAvailableProfessionalAsync(
        Guid establishmentId, Guid serviceId,
        DateTime scheduledAt, DateTime endsAt, DateOnly date,
        CancellationToken ct)
    {
        var candidates = await _db.ProfessionalServices
            .IgnoreQueryFilters()
            .Include(ps => ps.Professional)
            .Where(ps =>
                ps.ServiceId == serviceId &&
                ps.Professional.EstablishmentId == establishmentId &&
                ps.Professional.IsActive &&
                !ps.Professional.IsDeleted)
            .ToListAsync(ct);

        var available = new List<(Guid ProfId, int Count)>();
        foreach (var c in candidates)
        {
            var hasAvailability = await _db.Availabilities
                .IgnoreQueryFilters()
                .AnyAsync(a =>
                    a.ProfessionalId == c.ProfessionalId &&
                    a.DayOfWeek == date.DayOfWeek &&
                    a.IsActive, ct);
            if (!hasAvailability) continue;

            var hasConflict = await _db.Bookings
                .IgnoreQueryFilters()
                .AnyAsync(b =>
                    b.ProfessionalId == c.ProfessionalId &&
                    b.Status != BookingStatus.Cancelado &&
                    b.Status != BookingStatus.NaoCompareceu &&
                    b.ScheduledAt < endsAt &&
                    b.EndsAt > scheduledAt, ct);
            if (hasConflict) continue;

            var count = await _db.Bookings
                .IgnoreQueryFilters()
                .CountAsync(b =>
                    b.ProfessionalId == c.ProfessionalId &&
                    DateOnly.FromDateTime(b.ScheduledAt) == date &&
                    b.Status != BookingStatus.Cancelado, ct);

            available.Add((c.ProfessionalId, count));
        }

        if (available.Count == 0)
            throw new BookingConflictException("Nenhum profissional disponível para este horário.");

        return available.OrderBy(x => x.Count).First().ProfId;
    }

}
