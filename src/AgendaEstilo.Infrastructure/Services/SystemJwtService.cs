using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace AgendaEstilo.Infrastructure.Services;

public class SystemJwtService : ISystemJwtService
{
    private readonly IConfiguration _config;

    public SystemJwtService(IConfiguration config) => _config = config;

    public string GenerateAccessToken(SystemUser user)
    {
        var key = _config["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret not configured");
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var roleName = user.Role == 0 ? "Admin" : "Promoter";

        var claims = new List<Claim>
        {
            new("sub",          user.Id.ToString()),
            new("jti",          Guid.NewGuid().ToString()),
            new("systemUserId", user.Id.ToString()),
            new("name",         user.Name),
            new("email",        user.Email),
            new("sysRole",      roleName),
        };

        if (user.Role == 1 && user.PromoterCode is not null)
            claims.Add(new Claim("promoterCode", user.PromoterCode));

        var token = new JwtSecurityToken(
            issuer:            _config["Jwt:Issuer"],
            audience:          _config["Jwt:Audience"],
            claims:            claims,
            expires:           DateTime.UtcNow.AddMinutes(60),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    public string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    /// <summary>Método estático para uso em contextos sem injeção de dependência.</summary>
    public static string HashTokenStatic(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
