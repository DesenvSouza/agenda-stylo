namespace AgendaEstilo.Domain.Entities;

public class ProfessionalService : BaseEntity
{
    public Guid ProfessionalId { get; set; }
    public Guid ServiceId { get; set; }
    public decimal? CustomPrice { get; set; }
    public int? CustomDuration { get; set; }

    public Professional Professional { get; set; } = null!;
    public Service Service { get; set; } = null!;
}
