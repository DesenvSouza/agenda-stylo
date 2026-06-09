using AgendaEstilo.Application.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Admin.Commands;

public record SetPromoterCommissionCommand(Guid PromoterId, decimal CommissionPercent) : IRequest;

public record TogglePromoterStatusCommand(Guid PromoterId) : IRequest<bool>;

public class SetPromoterCommissionCommandHandler : IRequestHandler<SetPromoterCommissionCommand>
{
    private readonly IAppDbContext _db;
    public SetPromoterCommissionCommandHandler(IAppDbContext db) => _db = db;

    public async Task Handle(SetPromoterCommissionCommand request, CancellationToken ct)
    {
        var p = await _db.SystemUsers.FirstOrDefaultAsync(u => u.Id == request.PromoterId && u.Role == 1, ct)
            ?? throw new InvalidOperationException("Promotor não encontrado.");

        p.CommissionPercent = request.CommissionPercent;
        p.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }
}

public class TogglePromoterStatusCommandHandler : IRequestHandler<TogglePromoterStatusCommand, bool>
{
    private readonly IAppDbContext _db;
    public TogglePromoterStatusCommandHandler(IAppDbContext db) => _db = db;

    public async Task<bool> Handle(TogglePromoterStatusCommand request, CancellationToken ct)
    {
        var p = await _db.SystemUsers.FirstOrDefaultAsync(u => u.Id == request.PromoterId && u.Role == 1, ct)
            ?? throw new InvalidOperationException("Promotor não encontrado.");

        p.IsActive = !p.IsActive;
        p.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return p.IsActive;
    }
}
