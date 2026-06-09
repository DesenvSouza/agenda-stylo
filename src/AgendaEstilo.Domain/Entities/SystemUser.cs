namespace AgendaEstilo.Domain.Entities;

/// <summary>Usuário do sistema (Admin ou Promotor). Não pertence a nenhum tenant.</summary>
public class SystemUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";

    /// <summary>0 = Admin, 1 = Promoter</summary>
    public int Role { get; set; }

    public bool IsActive { get; set; } = true;

    /// <summary>Código único de indicação (somente para Promotores).</summary>
    public string? PromoterCode { get; set; }

    public decimal CommissionPercent { get; set; } = 20m;

    /// <summary>Força troca de senha no primeiro acesso.</summary>
    public bool MustChangePassword { get; set; } = false;

    /// <summary>Refresh token armazenado como hash SHA-256.</summary>
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }

    public Guid? InvitedByAdminId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<PromoterConversion> Conversions { get; set; } = [];
}
