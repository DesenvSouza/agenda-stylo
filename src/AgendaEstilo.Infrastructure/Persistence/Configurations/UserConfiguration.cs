using AgendaEstilo.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgendaEstilo.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Email).IsRequired().HasMaxLength(200);
        builder.HasIndex(e => e.Email);
        builder.Property(e => e.PasswordHash).IsRequired();
        builder.Property(e => e.RefreshToken).HasMaxLength(500);
        builder.HasOne(e => e.Establishment).WithMany(e => e.Users).HasForeignKey(e => e.EstablishmentId);
        builder.HasOne(e => e.Professional).WithMany().HasForeignKey(e => e.ProfessionalId);
    }
}
