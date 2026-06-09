using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Public.Queries;

public record PublicEstablishmentDto(
    Guid Id,
    string Name,
    string Slug,
    EstablishmentCategory Category,
    string Phone,
    string? Address,
    string? CoverImageUrl,
    string? Description,
    string? WorkingHoursJson,
    List<PublicProfessionalDto> Professionals,
    List<PublicServiceDto> Services);

public record PublicProfessionalDto(Guid Id, string Name, string? PhotoUrl, string? Specialty, string? Bio);
public record PublicServiceDto(Guid Id, string Name, string? Category, int DurationMinutes, decimal Price, string? Description);

public record GetEstablishmentBySlugQuery(string Slug) : IRequest<PublicEstablishmentDto?>;

public class GetEstablishmentBySlugQueryHandler : IRequestHandler<GetEstablishmentBySlugQuery, PublicEstablishmentDto?>
{
    private readonly IAppDbContext _db;

    public GetEstablishmentBySlugQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<PublicEstablishmentDto?> Handle(GetEstablishmentBySlugQuery request, CancellationToken cancellationToken)
    {
        var e = await _db.Establishments
            .IgnoreQueryFilters()
            .Include(x => x.Professionals.Where(p => p.IsActive && !p.IsDeleted))
            .Include(x => x.Services.Where(s => s.IsActive && !s.IsDeleted))
            .FirstOrDefaultAsync(x => x.Slug == request.Slug && x.IsActive && !x.IsDeleted, cancellationToken);

        if (e == null) return null;

        return new PublicEstablishmentDto(
            e.Id, e.Name, e.Slug, e.Category, e.Phone, e.Address,
            e.CoverImageUrl, e.Description, e.WorkingHoursJson,
            e.Professionals.OrderBy(p => p.Order).Select(p => new PublicProfessionalDto(p.Id, p.Name, p.PhotoUrl, p.Specialty, p.Bio)).ToList(),
            e.Services.OrderBy(s => s.Order).Select(s => new PublicServiceDto(s.Id, s.Name, s.Category, s.DurationMinutes, s.Price, s.Description)).ToList()
        );
    }
}
