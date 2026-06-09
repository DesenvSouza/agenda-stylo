using AgendaEstilo.Application.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Services.Commands;

public record DeleteServiceCommand(Guid Id) : IRequest;

public class DeleteServiceCommandHandler : IRequestHandler<DeleteServiceCommand>
{
    private readonly IAppDbContext _db;
    public DeleteServiceCommandHandler(IAppDbContext db) => _db = db;

    public async Task Handle(DeleteServiceCommand request, CancellationToken cancellationToken)
    {
        var service = await _db.Services
            .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("Serviço não encontrado.");

        // Soft delete — preserva histórico de agendamentos
        service.IsDeleted = true;
        service.IsActive = false;
        await _db.SaveChangesAsync(cancellationToken);
    }
}
