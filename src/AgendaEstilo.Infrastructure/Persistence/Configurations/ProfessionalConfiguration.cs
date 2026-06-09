using AgendaEstilo.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgendaEstilo.Infrastructure.Persistence.Configurations;

public class ProfessionalConfiguration : IEntityTypeConfiguration<Professional>
{
    public void Configure(EntityTypeBuilder<Professional> builder)
    {
        builder.ToTable("professionals");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Name).IsRequired().HasMaxLength(200);
        builder.Property(e => e.PhotoUrl).HasMaxLength(500);
        builder.Property(e => e.Specialty).HasMaxLength(100);
        builder.HasOne(e => e.Establishment)
            .WithMany(e => e.Professionals)
            .HasForeignKey(e => e.EstablishmentId);
    }
}
