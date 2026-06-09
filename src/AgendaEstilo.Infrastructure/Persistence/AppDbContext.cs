using System.Data;
using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Entities;
using AgendaEstilo.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace AgendaEstilo.Infrastructure.Persistence;

public class AppDbContext : DbContext, IAppDbContext
{
    private readonly ITenantService _tenantService;

    public AppDbContext(DbContextOptions<AppDbContext> options, ITenantService tenantService)
        : base(options)
    {
        _tenantService = tenantService;
    }

    public Task<IDbContextTransaction> BeginSerializableTransactionAsync(CancellationToken cancellationToken = default)
        => Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);

    public DbSet<Establishment> Establishments => Set<Establishment>();
    public DbSet<Professional> Professionals => Set<Professional>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<ProfessionalService> ProfessionalServices => Set<ProfessionalService>();
    public DbSet<Availability> Availabilities => Set<Availability>();
    public DbSet<BlockedSlot> BlockedSlots => Set<BlockedSlot>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<ReminderLog> ReminderLogs => Set<ReminderLog>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        modelBuilder.Entity<Establishment>().HasQueryFilter(e => e.TenantId == _tenantService.TenantId && !e.IsDeleted);
        modelBuilder.Entity<Professional>().HasQueryFilter(e => e.TenantId == _tenantService.TenantId && !e.IsDeleted);
        modelBuilder.Entity<Service>().HasQueryFilter(e => e.TenantId == _tenantService.TenantId && !e.IsDeleted);
        modelBuilder.Entity<ProfessionalService>().HasQueryFilter(e => e.TenantId == _tenantService.TenantId && !e.IsDeleted);
        modelBuilder.Entity<Availability>().HasQueryFilter(e => e.TenantId == _tenantService.TenantId && !e.IsDeleted);
        modelBuilder.Entity<BlockedSlot>().HasQueryFilter(e => e.TenantId == _tenantService.TenantId && !e.IsDeleted);
        modelBuilder.Entity<Client>().HasQueryFilter(e => e.TenantId == _tenantService.TenantId && !e.IsDeleted);
        modelBuilder.Entity<Booking>().HasQueryFilter(e => e.TenantId == _tenantService.TenantId && !e.IsDeleted);
        modelBuilder.Entity<ReminderLog>().HasQueryFilter(e => e.TenantId == _tenantService.TenantId && !e.IsDeleted);
        modelBuilder.Entity<User>().HasQueryFilter(e => e.TenantId == _tenantService.TenantId && !e.IsDeleted);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = now;
                    entry.Entity.UpdatedAt = now;
                    if (entry.Entity.TenantId == Guid.Empty)
                        entry.Entity.TenantId = _tenantService.TenantId;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = now;
                    break;
            }
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
