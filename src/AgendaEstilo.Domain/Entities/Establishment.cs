using AgendaEstilo.Domain.Enums;

namespace AgendaEstilo.Domain.Entities;

public class Establishment : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public EstablishmentCategory Category { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? CoverImageUrl { get; set; }
    public string? Description { get; set; }
    public string? WorkingHoursJson { get; set; }
    public bool IsActive { get; set; } = true;
    public string TimeZoneId { get; set; } = "America/Sao_Paulo";
    /// <summary>
    /// Quando true, profissionais podem ter acesso próprio para gerenciar
    /// perfil, agenda e ver seus agendamentos.
    /// </summary>
    public bool AllowProfessionalAccess { get; set; } = false;
    public string? ContactEmail { get; set; }
    public string? NotificationSettingsJson { get; set; }

    /// <summary>Código do promotor usado no cadastro (indica quem indicou).</summary>
    public string? ReferralCode { get; set; }

    /// <summary>Plano atual contratado ("Basico" | "Profissional"). Null = sem plano ativo.</summary>
    public string? CurrentPlan { get; set; }

    /// <summary>Data de expiração do plano atual. Null = não expira (usado para ativações manuais).</summary>
    public DateTime? PlanExpiresAt { get; set; }

    public ICollection<Professional> Professionals { get; set; } = new List<Professional>();
    public ICollection<PlanSubscriptionPayment> PlanPayments { get; set; } = new List<PlanSubscriptionPayment>();
    public ICollection<PromoterConversion> PromoterConversions { get; set; } = new List<PromoterConversion>();
    public ICollection<Service> Services { get; set; } = new List<Service>();
    public ICollection<Client> Clients { get; set; } = new List<Client>();
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    public ICollection<User> Users { get; set; } = new List<User>();
}
