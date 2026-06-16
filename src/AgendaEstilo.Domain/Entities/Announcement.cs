using AgendaEstilo.Domain.Enums;

namespace AgendaEstilo.Domain.Entities;

/// <summary>
/// Comunicado enviado pelo admin para os estabelecimentos da plataforma.
/// Entidade cross-tenant — não possui TenantId nem soft-delete.
/// </summary>
public class Announcement
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Título curto do comunicado (máx. 100 chars).</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Texto completo do comunicado (máx. 500 chars).</summary>
    public string Body { get; set; } = string.Empty;

    /// <summary>Nível de criticidade — determina a cor do banner.</summary>
    public AnnouncementSeverity Severity { get; set; } = AnnouncementSeverity.Info;

    /// <summary>Público-alvo: Todos, Basico ou Profissional.</summary>
    public AnnouncementTarget Target { get; set; } = AnnouncementTarget.Todos;

    /// <summary>Data/hora UTC de início da exibição.</summary>
    public DateTime StartsAt { get; set; }

    /// <summary>Data/hora UTC de encerramento automático.</summary>
    public DateTime EndsAt { get; set; }

    /// <summary>Texto do botão de ação (CTA). Nulo = sem botão.</summary>
    public string? ActionLabel { get; set; }

    /// <summary>URL do botão de ação. Pode ser link interno (/dashboard/...) ou externo.</summary>
    public string? ActionUrl { get; set; }

    /// <summary>Quando true, o estabelecimento pode fechar o aviso (persiste em localStorage).</summary>
    public bool IsDismissible { get; set; } = true;

    /// <summary>Permite desativar manualmente sem excluir.</summary>
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
