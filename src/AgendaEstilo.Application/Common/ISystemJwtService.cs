using AgendaEstilo.Domain.Entities;

namespace AgendaEstilo.Application.Common;

public interface ISystemJwtService
{
    string GenerateAccessToken(SystemUser user);
    string GenerateRefreshToken();
    string HashToken(string token);
}
