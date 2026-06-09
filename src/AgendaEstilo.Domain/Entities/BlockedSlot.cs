namespace AgendaEstilo.Domain.Entities;

public class BlockedSlot : BaseEntity
{
    public Guid ProfessionalId { get; set; }

    /// <summary>Data inicial (ou única data para bloqueio de dia único)</summary>
    public DateOnly Date { get; set; }

    /// <summary>Data final inclusive. Null = mesmo dia que Date (bloqueio de único dia)</summary>
    public DateOnly? DateEnd { get; set; }

    /// <summary>True = dia inteiro. False = horário parcial (StartTime-EndTime obrigatórios)</summary>
    public bool IsFullDay { get; set; } = true;

    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }

    /// <summary>Motivo/descrição do bloqueio</summary>
    public string? Reason { get; set; }

    /// <summary>Tipo: timeoff | vacation | other</summary>
    public string BlockType { get; set; } = "timeoff";

    public Professional Professional { get; set; } = null!;
}
