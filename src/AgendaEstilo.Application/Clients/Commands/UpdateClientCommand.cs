using AgendaEstilo.Application.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Clients.Commands;

public record UpdateClientCommand(Guid Id, string? Notes, string? Email) : IRequest;

public class UpdateClientCommandHandler : IRequestHandler<UpdateClientCommand>
{
    private readonly IAppDbContext _db;
    public UpdateClientCommandHandler(IAppDbContext db) => _db = db;

    public async Task Handle(UpdateClientCommand request, CancellationToken cancellationToken)
    {
        var client = await _db.Clients.FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("Cliente não encontrado.");

        client.Notes = request.Notes;
        if (request.Email is not null) client.Email = request.Email;

        await _db.SaveChangesAsync(cancellationToken);
    }
}
