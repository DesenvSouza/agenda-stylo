using AgendaEstilo.Application.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Services.Commands;

public record ToggleServiceActiveCommand(Guid Id) : IRequest<bool>;

public class ToggleServiceActiveCommandHandler
    : IRequestHandler<ToggleServiceActiveCommand, bool>
{
    private readonly IAppDbContext _db;
    public ToggleServiceActiveCommandHandler(IAppDbContext db) => _db = db;

    public async Task<bool> Handle(
        ToggleServiceActiveCommand request, CancellationToken cancellationToken)
    {
        var service = await _db.Services
            .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("Serviço não encontrado.");

        service.IsActive = !service.IsActive;
        await _db.SaveChangesAsync(cancellationToken);
        return service.IsActive;
    }
}
