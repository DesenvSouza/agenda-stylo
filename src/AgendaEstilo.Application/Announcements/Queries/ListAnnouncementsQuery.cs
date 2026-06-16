using AgendaEstilo.Application.Announcements.Commands;
using AgendaEstilo.Application.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Announcements.Queries;

/// <summary>
/// Retorna todos os comunicados (painel admin), ordenados por Severity DESC + StartsAt ASC.
/// </summary>
public record ListAnnouncementsQuery : IRequest<List<AnnouncementDto>>;

public class ListAnnouncementsQueryHandler : IRequestHandler<ListAnnouncementsQuery, List<AnnouncementDto>>
{
    private readonly IAppDbContext _db;
    public ListAnnouncementsQueryHandler(IAppDbContext db) => _db = db;

    public async Task<List<AnnouncementDto>> Handle(ListAnnouncementsQuery request, CancellationToken cancellationToken)
    {
        var list = await _db.Announcements
            .OrderByDescending(a => a.Severity)
            .ThenBy(a => a.StartsAt)
            .ToListAsync(cancellationToken);

        return list.Select(UpsertAnnouncementCommandHandler.ToDto).ToList();
    }
}
