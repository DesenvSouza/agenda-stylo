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
    public DbSet<SystemUser> SystemUsers => Set<SystemUser>();
    public DbSet<PlanSubscriptionPayment> PlanSubscriptionPayments => Set<PlanSubscriptionPayment>();
    public DbSet<PromoterConversion> PromoterConversions => Set<PromoterConversion>();
    public DbSet<Announcement> Announcements => Set<Announcement>();

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

        // ── Entidades cross-tenant (sem query filter de tenant) ──────────────
        modelBuilder.Entity<SystemUser>(b =>
        {
            b.ToTable("system_users");
            b.HasKey(e => e.Id);
            b.HasIndex(e => e.Email).IsUnique();
            b.HasIndex(e => e.PromoterCode).IsUnique().HasFilter("\"PromoterCode\" IS NOT NULL");
            b.Property(e => e.CommissionPercent).HasPrecision(5, 2);
        });

        modelBuilder.Entity<PlanSubscriptionPayment>(b =>
        {
            b.ToTable("plan_subscription_payments");
            b.HasKey(e => e.Id);
            b.HasIndex(e => e.EstablishmentId);
            b.HasIndex(e => e.PaidAt);
            b.Property(e => e.Amount).HasPrecision(18, 2);
            b.HasOne(e => e.Establishment)
             .WithMany(e => e.PlanPayments)
             .HasForeignKey(e => e.EstablishmentId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PromoterConversion>(b =>
        {
            b.ToTable("promoter_conversions");
            b.HasKey(e => e.Id);
            b.HasIndex(e => e.PromoterId);
            b.HasIndex(e => e.EstablishmentId).IsUnique(); // cada estabelecimento só gera 1 comissão
            b.Property(e => e.PlanAmount).HasPrecision(18, 2);
            b.Property(e => e.CommissionAmount).HasPrecision(18, 2);
            b.HasOne(e => e.Promoter)
             .WithMany(e => e.Conversions)
             .HasForeignKey(e => e.PromoterId)
             .OnDelete(DeleteBehavior.Cascade);
            b.HasOne(e => e.Establishment)
             .WithMany(e => e.PromoterConversions)
             .HasForeignKey(e => e.EstablishmentId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Comunicados (cross-tenant, sem query filter) ─────────────────────
        modelBuilder.Entity<Announcement>(b =>
        {
            b.ToTable("announcements");
            b.HasKey(e => e.Id);
            b.Property(e => e.Title).HasMaxLength(100).IsRequired();
            b.Property(e => e.Body).HasMaxLength(500).IsRequired();
            b.Property(e => e.ActionLabel).HasMaxLength(80);
            b.Property(e => e.ActionUrl).HasMaxLength(500);
            // Índices para a query de filtro ativa
            b.HasIndex(e => new { e.StartsAt, e.EndsAt });
            b.HasIndex(e => e.IsActive);
        });
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
