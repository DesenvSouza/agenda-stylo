using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Clients.Queries;

public record ClientBookingSummaryDto(
    Guid Id,
    string ServiceName,
    string ProfessionalName,
    DateTime ScheduledAt,
    BookingStatus Status,
    decimal ServicePrice);

public record ClientDetailDto(
    Guid Id,
    string Name,
    string Phone,
    string? Email,
    string? Notes,
    int VisitCount,
    DateTime? LastVisitAt,
    decimal TotalSpent,
    string? LastServiceName,
    List<ClientBookingSummaryDto> RecentBookings);

public record GetClientByIdQuery(Guid Id) : IRequest<ClientDetailDto?>;

public class GetClientByIdQueryHandler : IRequestHandler<GetClientByIdQuery, ClientDetailDto?>
{
    private readonly IAppDbContext _db;
    public GetClientByIdQueryHandler(IAppDbContext db) => _db = db;

    public async Task<ClientDetailDto?> Handle(GetClientByIdQuery request, CancellationToken cancellationToken)
    {
        var client = await _db.Clients
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);

        if (client == null) return null;

        var bookings = await _db.Bookings
            .Include(b => b.Service)
            .Include(b => b.Professional)
            .Where(b => b.ClientId == request.Id)
            .OrderByDescending(b => b.ScheduledAt)
            .Take(10)
            .ToListAsync(cancellationToken);

        var completed = bookings.Where(b => b.Status == BookingStatus.Concluido).ToList();
        var totalSpent = completed.Sum(b => b.Service?.Price ?? 0);
        var lastService = bookings.FirstOrDefault()?.Service?.Name;

        var recent = bookings.Select(b => new ClientBookingSummaryDto(
            b.Id,
            b.Service?.Name ?? "",
            b.Professional?.Name ?? "",
            b.ScheduledAt,
            b.Status,
            b.Service?.Price ?? 0)).ToList();

        return new ClientDetailDto(
            client.Id,
            client.Name,
            client.Phone,
            client.Email,
            client.Notes,
            client.VisitCount,
            client.LastVisitAt,
            totalSpent,
            lastService,
            recent);
    }
}
