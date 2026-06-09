using AgendaEstilo.Application.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Professionals.Commands;

/// <summary>Remove o acesso do profissional (soft-delete do User).</summary>
public record RevokeProfessionalAccessCommand(Guid ProfessionalId) : IRequest;

public class RevokeProfessionalAccessCommandHandler : IRequestHandler<RevokeProfessionalAccessCommand>
{
    private readonly IAppDbContext _db;

    public RevokeProfessionalAccessCommandHandler(IAppDbContext db) => _db = db;

    public async Task Handle(RevokeProfessionalAccessCommand request, CancellationToken ct)
    {
        var user = await _db.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.ProfessionalId == request.ProfessionalId && !u.IsDeleted, ct);

        if (user is null) return; // já sem acesso

        user.IsDeleted = true;
        user.RefreshToken = null;
        user.RefreshTokenExpiry = null;
        await _db.SaveChangesAsync(ct);
    }
}
