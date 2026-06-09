using AgendaEstilo.Application.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Professionals.Commands;

public record ToggleProfessionalActiveCommand(Guid Id) : IRequest<bool>;

public class ToggleProfessionalActiveCommandHandler
    : IRequestHandler<ToggleProfessionalActiveCommand, bool>
{
    private readonly IAppDbContext _db;
    public ToggleProfessionalActiveCommandHandler(IAppDbContext db) => _db = db;

    public async Task<bool> Handle(
        ToggleProfessionalActiveCommand request, CancellationToken cancellationToken)
    {
        var professional = await _db.Professionals
            .FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("Profissional não encontrado.");

        professional.IsActive = !professional.IsActive;
        await _db.SaveChangesAsync(cancellationToken);
        return professional.IsActive;
    }
}
