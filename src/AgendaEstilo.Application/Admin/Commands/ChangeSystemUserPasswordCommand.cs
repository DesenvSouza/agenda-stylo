using AgendaEstilo.Application.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Admin.Commands;

public record ChangeSystemUserPasswordCommand(
    Guid SystemUserId,
    string CurrentPassword,
    string NewPassword) : IRequest;

public record SetInitialPasswordCommand(
    Guid SystemUserId,
    string NewPassword) : IRequest;

// ── Troca com senha atual ────────────────────────────────────────────────────
public class ChangeSystemUserPasswordCommandHandler : IRequestHandler<ChangeSystemUserPasswordCommand>
{
    private readonly IAppDbContext _db;
    public ChangeSystemUserPasswordCommandHandler(IAppDbContext db) => _db = db;

    public async Task Handle(ChangeSystemUserPasswordCommand request, CancellationToken ct)
    {
        var user = await _db.SystemUsers.FirstOrDefaultAsync(u => u.Id == request.SystemUserId, ct)
            ?? throw new InvalidOperationException("Usuário não encontrado.");

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            throw new InvalidOperationException("Senha atual incorreta.");

        user.PasswordHash       = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.MustChangePassword = false;
        user.UpdatedAt          = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }
}

// ── Troca inicial (sem exigir senha atual — primeiro acesso) ─────────────────
public class SetInitialPasswordCommandHandler : IRequestHandler<SetInitialPasswordCommand>
{
    private readonly IAppDbContext _db;
    public SetInitialPasswordCommandHandler(IAppDbContext db) => _db = db;

    public async Task Handle(SetInitialPasswordCommand request, CancellationToken ct)
    {
        var user = await _db.SystemUsers.FirstOrDefaultAsync(u => u.Id == request.SystemUserId, ct)
            ?? throw new InvalidOperationException("Usuário não encontrado.");

        user.PasswordHash       = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.MustChangePassword = false;
        user.UpdatedAt          = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }
}
