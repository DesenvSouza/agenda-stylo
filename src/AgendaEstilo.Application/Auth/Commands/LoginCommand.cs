using AgendaEstilo.Application.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace AgendaEstilo.Application.Auth.Commands;

public record LoginCommand(string Email, string Password) : IRequest<LoginResult>;

public record LoginResult(string AccessToken, string RefreshToken, string Role, Guid EstablishmentId, string Slug, Guid? ProfessionalId = null);

public class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public class LoginCommandHandler : IRequestHandler<LoginCommand, LoginResult>
{
    private readonly IAppDbContext _db;
    private readonly IConfiguration _config;

    public LoginCommandHandler(IAppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<LoginResult> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var login = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => !u.IsDeleted && u.Email == login, cancellationToken)
            ?? throw new UnauthorizedAccessException("Credenciais inválidas.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Credenciais inválidas.");

        var slug = await _db.Establishments
            .IgnoreQueryFilters()
            .Where(e => e.Id == user.EstablishmentId)
            .Select(e => e.Slug)
            .FirstOrDefaultAsync(cancellationToken) ?? string.Empty;

        var accessToken = GenerateJwt(user);
        var refreshToken = Guid.NewGuid().ToString("N");

        user.RefreshToken = BCrypt.Net.BCrypt.HashPassword(refreshToken);
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(30);
        await _db.SaveChangesAsync(cancellationToken);

        return new LoginResult(accessToken, refreshToken, user.Role.ToString(), user.EstablishmentId, slug, user.ProfessionalId);
    }

    private string GenerateJwt(Domain.Entities.User user)
    {
        var key = Encoding.UTF8.GetBytes(_config["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret not configured"));
        var claimsList = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim("tid", user.TenantId.ToString()),
            new Claim("eid", user.EstablishmentId.ToString()),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
        };
        if (user.ProfessionalId.HasValue)
            claimsList.Add(new Claim("pid", user.ProfessionalId.Value.ToString()));
        var claims = claimsList.ToArray();
        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
