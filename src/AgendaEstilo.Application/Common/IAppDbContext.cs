using AgendaEstilo.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace AgendaEstilo.Application.Common;

public interface IAppDbContext
{
    Task<IDbContextTransaction> BeginSerializableTransactionAsync(CancellationToken cancellationToken = default);
    DbSet<Establishment> Establishments { get; }
    DbSet<Professional> Professionals { get; }
    DbSet<Service> Services { get; }
    DbSet<ProfessionalService> ProfessionalServices { get; }
    DbSet<Availability> Availabilities { get; }
    DbSet<BlockedSlot> BlockedSlots { get; }
    DbSet<Client> Clients { get; }
    DbSet<Booking> Bookings { get; }
    DbSet<ReminderLog> ReminderLogs { get; }
    DbSet<User> Users { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
