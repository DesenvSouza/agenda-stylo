using AgendaEstilo.Application.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Admin.Commands;

public record AdminLoginCommand(string Email, string Password) : IRequest<AdminAuthResult>;

public record AdminAuthResult(
    string AccessToken,
    string RefreshToken,
    string Role,
    Guid SystemUserId,
    string Name,
    string Email,
    string? PromoterCode,
    bool MustChangePassword);

public class AdminLoginCommandHandler : IRequestHandler<AdminLoginCommand, AdminAuthResult>
{
    private readonly IAppDbContext _db;
    private readonly ISystemJwtService _jwt;

    public AdminLoginCommandHandler(IAppDbContext db, ISystemJwtService jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    public async Task<AdminAuthResult> Handle(AdminLoginCommand request, CancellationToken ct)
    {
        var user = await _db.SystemUsers
            .FirstOrDefaultAsync(u => u.Email == request.Email.Trim().ToLowerInvariant() && u.IsActive, ct)
            ?? throw new UnauthorizedAccessException("Credenciais inválidas.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Credenciais inválidas.");

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
