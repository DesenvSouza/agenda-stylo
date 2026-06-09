using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Entities;
using AgendaEstilo.Domain.Enums;
using AgendaEstilo.Domain.Exceptions;
using AgendaEstilo.Domain.Interfaces;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Bookings.Commands;

public record CreateBookingCommand(
    Guid EstablishmentId,
    Guid ProfessionalId,
    Guid ServiceId,
    string ClientName,
    string ClientPhone,
    string? ClientEmail,
    DateTime ScheduledAt,
    BookingSource Source = BookingSource.Online,
    string? Notes = null) : IRequest<CreateBookingResult>;

public record CreateBookingResult(Guid BookingId, string CancelToken);

public class CreateBookingCommandValidator : AbstractValidator<CreateBookingCommand>
{
    public CreateBookingCommandValidator()
    {
        RuleFor(x => x.EstablishmentId).NotEmpty();
        RuleFor(x => x.ProfessionalId).NotEmpty();
        RuleFor(x => x.ServiceId).NotEmpty();
        RuleFor(x => x.ClientName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ClientPhone).NotEmpty().MaximumLength(20);
        RuleFor(x => x.ScheduledAt).GreaterThan(DateTime.UtcNow);
    }
}

public class CreateBookingCommandHandler : IRequestHandler<CreateBookingCommand, CreateBookingResult>
{
    private readonly IAppDbContext _db;
    private readonly ITenantService _tenantService;
    private readonly ISlotCacheService _slotCache;

    public CreateBookingCommandHandler(
        IAppDbContext db, ITenantService tenantService, ISlotCacheService slotCache)
    {
        _db = db;
        _tenantService = tenantService;
        _slotCache = slotCache;
    }

    public async Task<CreateBookingResult> Handle(
        CreateBookingCommand request, CancellationToken cancellationToken)
    {
        var service = await _db.Services
            .FirstOrDefaultAsync(
                s => s.Id == request.ServiceId && s.EstablishmentId == request.EstablishmentId,
                cancellationToken)
            ?? throw new InvalidOperationException("Serviço não encontrado.");

        var scheduledAt = request.ScheduledAt.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(request.ScheduledAt, DateTimeKind.Utc)
            : request.ScheduledAt.ToUniversalTime();
        var endsAt = scheduledAt.AddMinutes(service.DurationMinutes);

        // Transação serializável para evitar race condition de double-booking
        await using var tx = await _db.BeginSerializableTransactionAsync(cancellationToken);

        var conflict = await _db.Bookings.AnyAsync(b =>
            b.ProfessionalId == request.ProfessionalId &&
            b.Status != BookingStatus.Cancelado &&
            b.Status != BookingStatus.NaoCompareceu &&
            b.ScheduledAt < endsAt &&
            b.EndsAt > scheduledAt, cancellationToken);

        if (conflict)
            throw new BookingConflictException();

        var tenantId = _tenantService.TenantId == Guid.Empty
            ? await _db.Establishments.IgnoreQueryFilters()
                .Where(e => e.Id == request.EstablishmentId)
                .Select(e => e.TenantId)
                .FirstOrDefaultAsync(cancellationToken)
            : _tenantService.TenantId;

        var client = await _db.Clients.FirstOrDefaultAsync(
            c => c.Phone == request.ClientPhone && c.EstablishmentId == request.EstablishmentId,
            cancellationToken);

        if (client == null)
        {
            client = new Client
            {
                TenantId = tenantId,
                EstablishmentId = request.EstablishmentId,
                Name = request.ClientName,
                Phone = request.ClientPhone,
                Email = request.ClientEmail
            };
            _db.Clients.Add(client);
        }

        var booking = new Booking
        {
            TenantId = tenantId,
            EstablishmentId = request.EstablishmentId,
            ProfessionalId = request.ProfessionalId,
            ServiceId = request.ServiceId,
            Client = client,
            ScheduledAt = scheduledAt,
            EndsAt = endsAt,
            Source = request.Source,
            Notes = request.Notes,
            Status = BookingStatus.Confirmado
        };

        _db.Bookings.Add(booking);
        await _db.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);

        // Invalida cache de slots do profissional na data agendada
        _slotCache.InvalidateScope($"{request.EstablishmentId}_{DateOnly.FromDateTime(scheduledAt)}");

        return new CreateBookingResult(booking.Id, booking.CancelToken);
    }
}
