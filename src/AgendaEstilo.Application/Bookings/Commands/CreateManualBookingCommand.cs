using System.Data;
using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Entities;
using AgendaEstilo.Domain.Enums;
using AgendaEstilo.Domain.Exceptions;
using AgendaEstilo.Domain.Interfaces;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Bookings.Commands;

public record CreateManualBookingCommand(
    Guid EstablishmentId,
    Guid ProfessionalId,
    Guid ServiceId,
    DateTime ScheduledAt,
    string ClientName,
    string? ClientPhone,
    BookingSource Source = BookingSource.Presencial,
    string? Notes = null) : IRequest<CreateBookingResult>;

public class CreateManualBookingCommandValidator : AbstractValidator<CreateManualBookingCommand>
{
    public CreateManualBookingCommandValidator()
    {
        RuleFor(x => x.EstablishmentId).NotEmpty();
        RuleFor(x => x.ProfessionalId).NotEmpty();
        RuleFor(x => x.ServiceId).NotEmpty();
        RuleFor(x => x.ClientName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ScheduledAt).GreaterThan(DateTime.UtcNow.AddHours(-1)); // permite retroativo de 1h
    }
}

public class CreateManualBookingCommandHandler : IRequestHandler<CreateManualBookingCommand, CreateBookingResult>
{
    private readonly IAppDbContext _db;
    private readonly ITenantService _tenantService;
    private readonly ISlotCacheService _slotCache;

    public CreateManualBookingCommandHandler(
        IAppDbContext db, ITenantService tenantService, ISlotCacheService slotCache)
    {
        _db = db; _tenantService = tenantService; _slotCache = slotCache;
    }

    public async Task<CreateBookingResult> Handle(CreateManualBookingCommand request, CancellationToken ct)
    {
        var service = await _db.Services
            .FirstOrDefaultAsync(s => s.Id == request.ServiceId && s.EstablishmentId == request.EstablishmentId, ct)
            ?? throw new InvalidOperationException("Serviço não encontrado.");

        var scheduledAt = request.ScheduledAt.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(request.ScheduledAt, DateTimeKind.Utc)
            : request.ScheduledAt.ToUniversalTime();
        var endsAt = scheduledAt.AddMinutes(service.DurationMinutes);

        await using var tx = await _db.BeginSerializableTransactionAsync(ct);

        var conflict = await _db.Bookings.AnyAsync(b =>
            b.ProfessionalId == request.ProfessionalId &&
            b.Status != BookingStatus.Cancelado &&
            b.Status != BookingStatus.NaoCompareceu &&
            b.ScheduledAt < endsAt &&
            b.EndsAt > scheduledAt, ct);

        if (conflict) throw new BookingConflictException();

        var client = await _db.Clients.FirstOrDefaultAsync(c =>
            c.Phone == (request.ClientPhone ?? "") &&
            c.EstablishmentId == request.EstablishmentId, ct);

        if (client == null)
        {
            client = new Client
            {
                TenantId = _tenantService.TenantId,
                EstablishmentId = request.EstablishmentId,
                Name = request.ClientName,
                Phone = request.ClientPhone ?? "",
            };
            _db.Clients.Add(client);
        }

        var booking = new Booking
        {
            TenantId = _tenantService.TenantId,
            EstablishmentId = request.EstablishmentId,
            ProfessionalId = request.ProfessionalId,
            ServiceId = request.ServiceId,
            Client = client,
            ScheduledAt = scheduledAt,
            EndsAt = endsAt,
            Source = request.Source,
            Status = BookingStatus.Confirmado,
            Notes = request.Notes,
        };

        _db.Bookings.Add(booking);
        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        _slotCache.InvalidateScope($"{request.EstablishmentId}_{DateOnly.FromDateTime(scheduledAt)}");

        return new CreateBookingResult(booking.Id, booking.CancelToken);
    }
}
