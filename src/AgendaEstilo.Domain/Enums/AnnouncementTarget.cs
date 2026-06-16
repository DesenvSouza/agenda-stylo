namespace AgendaEstilo.Domain.Enums;

public enum AnnouncementTarget
{
    /// <summary>Todos os estabelecimentos (qualquer plano ou sem plano).</summary>
    Todos        = 0,
    /// <summary>Apenas estabelecimentos com plano Básico ativo.</summary>
    Basico       = 1,
    /// <summary>Apenas estabelecimentos com plano Profissional ativo.</summary>
    Profissional = 2,
}
