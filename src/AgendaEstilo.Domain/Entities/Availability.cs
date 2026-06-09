namespace AgendaEstilo.Domain.Entities;

public class Availability : BaseEntity
{
    public Guid ProfessionalId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public TimeOnly? BreakStart { get; set; }  // legado — mantido para compatibilidade
    public TimeOnly? BreakEnd { get; set; }    // legado — mantido para compatibilidade

    /// <summary>JSON: [{id, label, startTime, endTime}] — múltiplas pausas por dia</summary>
    public string? BreaksJson { get; set; }

    public bool IsActive { get; set; } = true;

    public Professional Professional { get; set; } = null!;
}
