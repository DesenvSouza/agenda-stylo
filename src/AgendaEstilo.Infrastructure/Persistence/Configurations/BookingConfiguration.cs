using AgendaEstilo.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgendaEstilo.Infrastructure.Persistence.Configurations;

public class BookingConfiguration : IEntityTypeConfiguration<Booking>
{
    public void Configure(EntityTypeBuilder<Booking> builder)
    {
        builder.ToTable("bookings");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.CancelToken).IsRequired().HasMaxLength(64);
        builder.HasIndex(e => e.CancelToken).IsUnique();
        builder.Property(e => e.Notes).HasMaxLength(1000);
        builder.HasOne(e => e.Establishment).WithMany(e => e.Bookings).HasForeignKey(e => e.EstablishmentId);
        builder.HasOne(e => e.Professional).WithMany(e => e.Bookings).HasForeignKey(e => e.ProfessionalId);
        builder.HasOne(e => e.Service).WithMany(e => e.Bookings).HasForeignKey(e => e.ServiceId);
        builder.HasOne(e => e.Client).WithMany(e => e.Bookings).HasForeignKey(e => e.ClientId);
    }
}
