namespace AgendaEstilo.Domain.Enums;

public enum CommissionType
{
    /// <summary>Sem comissão configurada.</summary>
    None = 0,
    /// <summary>Percentual sobre o valor do serviço (0–100).</summary>
    Percentage = 1,
    /// <summary>Valor fixo em reais descontado do serviço.</summary>
    Fixed = 2,
}
