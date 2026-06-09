using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Enums;
using AgendaEstilo.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Bookings.Queries;

public record BookingDto(
    Guid Id,
    Guid ClientId,
    string ClientName,
    string ClientPhone,
    Guid ServiceId,
    string ServiceName,
    decimal ServicePrice,
    Guid ProfessionalId,
    string ProfessionalName,
    string? ProfessionalPhotoUrl,
    DateTime ScheduledAt,
    DateTime EndsAt,
    BookingStatus Status,
    BookingSource Source,
    string? Notes);

public record GetBookingsQuery(
    Guid EstablishmentId,
    DateOnly? Date = null,
    DateOnly? DateFrom = null,
    DateOnly? DateTo = null,
    Guid? ProfessionalId = null,
    BookingStatus? Status = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 50) : IRequest<PagedResult<BookingDto>>;

public class GetBookingsQueryHandler : IRequestHandler<GetBookingsQuery, PagedResult<BookingDto>>
{
    private readonly IAppDbContext _db;
    private readonly ITenantService _tenantService;
    public GetBookingsQueryHandler(IAppDbContext db, ITenantService tenantService)
        => (_db, _tenantService) = (db, tenantService);

    public async Task<PagedResult<BookingDto>> Handle(GetBookingsQuery request, CancellationToken ct)
    {
        // IgnoreQueryFilters é necessário aqui porque o EF Core propaga o filtro global
        // (TenantId == _tenantService.TenantId) para as entidades incluídas (Service,
        // Professional, Client). Se qualquer uma delas tiver TenantId errado, a navegação
        // fica nula e a projeção b.Service.Name lança NullReferenceException.
        // Aplicamos o filtro de tenant e soft-delete manualmente só no Booking.
        var tenantId = _tenantService.TenantId;
        var query = _db.Bookings
            .IgnoreQueryFilters()
            .Include(b => b.Client)
            .Include(b => b.Service)
            .Include(b => b.Professional)
            .Where(b =>
                b.TenantId == tenantId &&
                !b.IsDeleted &&
                b.EstablishmentId == request.EstablishmentId);

        if (request.Date.HasValue)
        {
            var start = DateTime.SpecifyKind(request.Date.Value.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            var end = DateTime.SpecifyKind(request.Date.Value.ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc);
            query = query.Where(b => b.ScheduledAt >= start && b.ScheduledAt <= end);
        }
        else
        {
            if (request.DateFrom.HasValue)
            {
                var from = DateTime.SpecifyKind(request.DateFrom.Value.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
                query = query.Where(b => b.ScheduledAt >= from);
            }
            if (request.DateTo.HasValue)
            {
                var to = DateTime.SpecifyKind(request.DateTo.Value.ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc);
                query = query.Where(b => b.ScheduledAt <= to);
            }
        }

        if (request.ProfessionalId.HasValue)
            query = query.Where(b => b.ProfessionalId == request.ProfessionalId);

        if (request.Status.HasValue)
            query = query.Where(b => b.Status == request.Status);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.ToLower();
            query = query.Where(b =>
                b.Client.Name.ToLower().Contains(s) ||
                b.Client.Phone.Contains(s));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(b => b.ScheduledAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(b => new BookingDto(
                b.Id,
                b.ClientId,
                b.Client.Name,
                b.Client.Phone,
                b.ServiceId,
                b.Service.Name,
                b.Service.Price,
                b.ProfessionalId,
                b.Professional.Name,
                b.Professional.PhotoUrl,
                b.ScheduledAt,
                b.EndsAt,
                b.Status,
                b.Source,
                b.Notes))
            .ToListAsync(ct);

        return new PagedResult<BookingDto> { Items = items, TotalCount = total, Page = request.Page, PageSize = request.PageSize };
    }
}
