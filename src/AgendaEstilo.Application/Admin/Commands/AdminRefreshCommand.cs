using AgendaEstilo.Application.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Admin.Commands;

public record AdminRefreshCommand(Guid SystemUserId, string RefreshToken) : IRequest<AdminAuthResult>;

public class AdminRefreshCommandHandler : IRequestHandler<AdminRefreshCommand, AdminAuthResult>
{
    private readonly IAppDbContext _db;
    private readonly ISystemJwtService _jwt;

    public AdminRefreshCommandHandler(IAppDbContext db, ISystemJwtService jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    public async Task<AdminAuthResult> Handle(AdminRefreshCommand request, CancellationToken ct)
    {
        var user = await _db.SystemUsers.FirstOrDefaultAsync(u => u.Id == request.SystemUserId, ct)
            ?? throw new UnauthorizedAccessException("Sessão inválida.");

        var hash = _jwt.HashToken(request.RefreshToken);
        if (user.RefreshToken != hash || user.RefreshTokenExpiry < DateTime.UtcNow)
            throw new UnauthorizedAccessException("Refresh token inválido ou expirado.");

        var accessToken  = _jwt.GenerateAccessToken(user);
        var refreshToken = _jwt.GenerateRefreshToken();

        user.RefreshToken       = _jwt.HashToken(refreshToken);
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(30);
        user.UpdatedAt          = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        var roleName = user.Role == 0 ? "Admin" : "Promoter";
        return new AdminAuthResult(accessToken, refreshToken, roleName,
            user.Id, user.Name, user.Email, user.PromoterCode, user.MustChangePassword);
    }
}
