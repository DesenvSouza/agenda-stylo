using AgendaEstilo.Domain.Enums;

namespace AgendaEstilo.Domain.Entities;

public class User : BaseEntity
{
    public Guid EstablishmentId { get; set; }
    public Guid? ProfessionalId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }
    public UserRole Role { get; set; }

    public Establishment Establishment { get; set; } = null!;
    public Professional? Professional { get; set; }
}
