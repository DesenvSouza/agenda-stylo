using AgendaEstilo.Application.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Announcements.Commands;

public record DeleteAnnouncementCommand(Guid Id) : IRequest;

public class DeleteAnnouncementCommandHandler : IRequestHandler<DeleteAnnouncementCommand>
{
    private readonly IAppDbContext _db;
    public DeleteAnnouncementCommandHandler(IAppDbContext db) => _db = db;

    public async Task Handle(DeleteAnnouncementCommand request, CancellationToken cancellationToken)
    {
        var entity = await _db.Announcements
            .FirstOrDefaultAsync(a => a.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("Comunicado não encontrado.");

        _db.Announcements.Remove(entity);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
