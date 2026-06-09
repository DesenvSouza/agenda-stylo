using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Public.Queries;

public record PublicPageDto(
    PublicEstablishmentInfoDto Establishment,
    List<PublicServiceItemDto> Services,
    List<PublicProfessionalItemDto> Professionals);

public record PublicEstablishmentInfoDto(
    Guid Id,
    string Name,
    EstablishmentCategory Category,
    string? Description,
    string? CoverImageUrl,
    string? Address,
    string Phone,
    string? WorkingHoursJson,
    string TimeZoneId);

public record PublicServiceItemDto(
    Guid Id,
    string Name,
    string? Category,
    int DurationMinutes,
    decimal Price,
    string? Description);

public record PublicProfessionalItemDto(
    Guid Id,
    string Name,
    string? PhotoUrl,
    string? Specialty,
    List<Guid> ServiceIds);

public record GetPublicPageQuery(string Slug) : IRequest<PublicPageDto?>;

public class GetPublicPageQueryHandler : IRequestHandler<GetPublicPageQuery, PublicPageDto?>
{
    private readonly IAppDbContext _db;

    public GetPublicPageQueryHandler(IAppDbContext db) => _db = db;

    public async Task<PublicPageDto?> Handle(GetPublicPageQuery request, CancellationToken ct)
    {
        var e = await _db.Establishments
            .IgnoreQueryFilters()
            .Include(x => x.Professionals.Where(p => p.IsActive && !p.IsDeleted))
            .Include(x => x.Services.Where(s => s.IsActive && !s.IsDeleted))
            .FirstOrDefaultAsync(x => x.Slug == request.Slug && x.IsActive && !x.IsDeleted, ct);

        if (e == null) return null;

        var profIds = e.Professionals.Select(p => p.Id).ToList();
        var profServices = await _db.ProfessionalServices
            .IgnoreQueryFilters()
            .Where(ps => profIds.Contains(ps.ProfessionalId))
            .Select(ps => new { ps.ProfessionalId, ps.ServiceId })
            .ToListAsync(ct);

        return new PublicPageDto(
            new PublicEstablishmentInfoDto(
                e.Id, e.Name, e.Category, e.Description,
                e.CoverImageUrl, e.Address, e.Phone,
                e.WorkingHoursJson, e.TimeZoneId),
            e.Services
                .OrderBy(s => s.Order)
                .Select(s => new PublicServiceItemDto(s.Id, s.Name, s.Category, s.DurationMinutes, s.Price, s.Description))
                .ToList(),
            e.Professionals
                .OrderBy(p => p.Order)
                .Select(p => new PublicProfessionalItemDto(
                    p.Id, p.Name, p.PhotoUrl, p.Specialty,
                    profServices.Where(ps => ps.ProfessionalId == p.Id).Select(ps => ps.ServiceId).ToList()))
                .ToList());
    }
}
