using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace AgendaEstilo.Tests;

/// <summary>
/// Lightweight DbContext backed by EF Core in-memory provider for unit tests.
/// Does not enforce global query filters (TenantId / IsDeleted) intentionally.
/// BeginSerializableTransactionAsync returns a no-op fake transaction.
/// </summary>
public class TestAppDbContext : DbContext, IAppDbContext
{
    public TestAppDbContext(DbContextOptions<TestAppDbContext> options) : base(options) { }

    public DbSet<Establishment> Establishments { get; set; } = null!;
    public DbSet<Professional> Professionals { get; set; } = null!;
    public DbSet<Service> Services { get; set; } = null!;
    public DbSet<ProfessionalService> ProfessionalServices { get; set; } = null!;
    public DbSet<Availability> Availabilities { get; set; } = null!;
    public DbSet<BlockedSlot> BlockedSlots { get; set; } = null!;
    public DbSet<Client> Clients { get; set; } = null!;
    public DbSet<Booking> Bookings { get; set; } = null!;
    public DbSet<ReminderLog> ReminderLogs { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;

    public Task<IDbContextTransaction> BeginSerializableTransactionAsync(CancellationToken cancellationToken = default)
        => Task.FromResult<IDbContextTransaction>(new FakeDbContextTransaction());

    public static TestAppDbContext Create()
    {
        var opts = new DbContextOptionsBuilder<TestAppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new TestAppDbContext(opts);
    }
}
