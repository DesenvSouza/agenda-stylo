using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Enums;
using AgendaEstilo.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Bookings.Queries;

public record BookingDetailDto(
    Guid Id,
    string CancelToken,
    BookingStatus Status,
    BookingSource Source,
    DateTime ScheduledAt,
    DateTime EndsAt,
    string? Notes,
    BookingClientDetailDto Client,
    BookingServiceDetailDto Service,
    BookingProfessionalDetailDto Professional,
    List<ReminderLogDto> Reminders);

public record BookingClientDetailDto(Guid Id, string Name, string Phone, string? Email, int VisitCount, DateTime? LastVisitAt);
public record BookingServiceDetailDto(Guid Id, string Name, int DurationMinutes, decimal Price);
public record BookingProfessionalDetailDto(Guid Id, string Name, string? PhotoUrl, string? Specialty);
public record ReminderLogDto(ReminderType Type, ReminderChannel Channel, DateTime SentAt, bool Success);

public record GetBookingByIdQuery(Guid BookingId) : IRequest<BookingDetailDto?>;

public class GetBookingByIdQueryHandler : IRequestHandler<GetBookingByIdQuery, BookingDetailDto?>
{
    private readonly IAppDbContext _db;
    private readonly ITenantService _tenantService;
    public GetBookingByIdQueryHandler(IAppDbContext db, ITenantService tenantService)
        => (_db, _tenantService) = (db, tenantService);

    public async Task<BookingDetailDto?> Handle(GetBookingByIdQuery request, CancellationToken ct)
    {
        var tenantId = _tenantService.TenantId;
        // IgnoreQueryFilters para evitar que Service/Professional/Client sejam
        // filtrados pelo TenantId global e causem NullReferenceException na projeção.
        var b = await _db.Bookings
            .IgnoreQueryFilters()
            .Include(x => x.Client)
            .Include(x => x.Service)
            .Include(x => x.Professional)
            .Include(x => x.ReminderLogs)
            .FirstOrDefaultAsync(x => x.Id == request.BookingId && x.TenantId == tenantId && !x.IsDeleted, ct);

        if (b == null) return null;

        return new BookingDetailDto(
            b.Id, b.CancelToken, b.Status, b.Source, b.ScheduledAt, b.EndsAt, b.Notes,
            new BookingClientDetailDto(b.Client.Id, b.Client.Name, b.Client.Phone, b.Client.Email, b.Client.VisitCount, b.Client.LastVisitAt),
            new BookingServiceDetailDto(b.Service.Id, b.Service.Name, b.Service.DurationMinutes, b.Service.Price),
            new BookingProfessionalDetailDto(b.Professional.Id, b.Professional.Name, b.Professional.PhotoUrl, b.Professional.Specialty),
            b.ReminderLogs.OrderByDescending(r => r.SentAt)
                .Select(r => new ReminderLogDto(r.Type, r.Channel, r.SentAt, r.Success)).ToList());
    }
}
