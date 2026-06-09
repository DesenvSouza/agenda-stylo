using AgendaEstilo.Application.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Professionals.Commands;

public record DeleteProfessionalCommand(Guid Id) : IRequest;

public class DeleteProfessionalCommandHandler : IRequestHandler<DeleteProfessionalCommand>
{
    private readonly IAppDbContext _db;
    public DeleteProfessionalCommandHandler(IAppDbContext db) => _db = db;

    public async Task Handle(DeleteProfessionalCommand request, CancellationToken cancellationToken)
    {
        var professional = await _db.Professionals
            .FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("Profissional não encontrado.");

        // Soft delete — preserva histórico de agendamentos
        professional.IsDeleted = true;
        professional.IsActive = false;
        await _db.SaveChangesAsync(cancellationToken);
    }
}
