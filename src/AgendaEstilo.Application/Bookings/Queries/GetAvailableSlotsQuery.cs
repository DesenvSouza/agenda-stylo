using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Bookings.Queries;

public record TimeSlotDto(DateTime Start, DateTime End);

public record GetAvailableSlotsQuery(
    Guid ProfessionalId,
    Guid ServiceId,
    DateOnly Date,
    bool RequireFuture = true) : IRequest<List<TimeSlotDto>>;

public class GetAvailableSlotsQueryHandler : IRequestHandler<GetAvailableSlotsQuery, List<TimeSlotDto>>
{
    private readonly IAppDbContext _db;

    public GetAvailableSlotsQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<List<TimeSlotDto>> Handle(GetAvailableSlotsQuery request, CancellationToken cancellationToken)
    {
        var service = await _db.Services
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.Id == request.ServiceId, cancellationToken)
            ?? throw new KeyNotFoundException("Serviço não encontrado.");

        var availability = await _db.Availabilities
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(a =>
                a.ProfessionalId == request.ProfessionalId &&
                a.DayOfWeek == request.Date.DayOfWeek &&
                a.IsActive, cancellationToken);

        if (availability == null) return [];

        var blockedSlots = await _db.BlockedSlots
            .IgnoreQueryFilters()
            .Where(b => b.ProfessionalId == request.ProfessionalId && b.Date == request.Date)
            .ToListAsync(cancellationToken);

        var existingBookings = await _db.Bookings
            .IgnoreQueryFilters()
            .Where(b =>
                b.ProfessionalId == request.ProfessionalId &&
                b.Status != BookingStatus.Cancelado &&
                DateOnly.FromDateTime(b.ScheduledAt) == request.Date)
            .ToListAsync(cancellationToken);

        var slots = new List<TimeSlotDto>();
        var duration = TimeSpan.FromMinutes(service.DurationMinutes);
        var current = DateTime.SpecifyKind(request.Date.ToDateTime(availability.StartTime), DateTimeKind.Utc);
        var end = DateTime.SpecifyKind(request.Date.ToDateTime(availability.EndTime), DateTimeKind.Utc);

        while (current + duration <= end)
        {
            var slotEnd = current + duration;
            var inBreak = availability.BreakStart.HasValue && availability.BreakEnd.HasValue &&
                current < DateTime.SpecifyKind(request.Date.ToDateTime(availability.BreakEnd.Value), DateTimeKind.Utc) &&
                slotEnd > DateTime.SpecifyKind(request.Date.ToDateTime(availability.BreakStart.Value), DateTimeKind.Utc);

            var isBlocked = blockedSlots.Any(b =>
                current < DateTime.SpecifyKind(request.Date.ToDateTime(b.EndTime), DateTimeKind.Utc) &&
                slotEnd > DateTime.SpecifyKind(request.Date.ToDateTime(b.StartTime), DateTimeKind.Utc));

            var isBooked = existingBookings.Any(b =>
                current < b.EndsAt && slotEnd > b.ScheduledAt);

            if (!inBreak && !isBlocked && !isBooked && (!request.RequireFuture || current > DateTime.UtcNow))
                slots.Add(new TimeSlotDto(current, slotEnd));

            current = current.AddMinutes(30);
        }

        return slots;
    }
}
