using AgendaEstilo.Application.Common;
using AgendaEstilo.Infrastructure.Services;
using AgendaEstilo.Domain.Interfaces;
using AgendaEstilo.Infrastructure.Jobs;
using AgendaEstilo.Infrastructure.Persistence;
using AgendaEstilo.Infrastructure.Services;
using Amazon.S3;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AgendaEstilo.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Connection string 'Default' not found.");

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        services.AddHttpContextAccessor();
        services.AddScoped<ITenantService, TenantService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<QrCodeService>();

        services.AddMemoryCache();
        services.AddSingleton<ISlotCacheService, SlotCacheService>();

        // Notificações
        services.AddScoped<IWhatsAppService, EvolutionWhatsAppService>();
        services.AddScoped<IEmailService, ResendEmailService>();
        services.AddScoped<IBookingNotificationService, BookingNotificationService>();
        services.AddScoped<SendRemindersJob>();

        // Legado (mantido para compatibilidade)
        services.AddScoped<INotificationJobService, NotificationJobService>();
        services.AddScoped<SystemJwtService>();
        services.AddScoped<ISystemJwtService>(sp => sp.GetRequiredService<SystemJwtService>());

        services.AddHttpClient();

        var r2Config = configuration.GetSection("CloudflareR2");
        var r2ServiceUrl  = r2Config["ServiceUrl"]      ?? "";
        var r2AccessKey   = r2Config["AccessKeyId"]     ?? "";
        var r2SecretKey   = r2Config["SecretAccessKey"] ?? "";

        // R2 está configurado quando: URL válida (sem placeholder), credenciais preenchidas
        var r2Configured =
            !string.IsNullOrWhiteSpace(r2ServiceUrl) &&
            !r2ServiceUrl.Contains('<')              &&   // detecta "<account-id>" etc.
            !string.IsNullOrWhiteSpace(r2AccessKey)  &&
            !string.IsNullOrWhiteSpace(r2SecretKey)  &&
            Uri.TryCreate(r2ServiceUrl, UriKind.Absolute, out _);

        if (r2Configured)
        {
            services.AddSingleton<IAmazonS3>(_ => new AmazonS3Client(
                r2AccessKey,
                r2SecretKey,
                new AmazonS3Config
                {
                    ServiceURL   = r2ServiceUrl,
                    ForcePathStyle = true
                }));
            services.AddScoped<IStorageService, StorageService>();
        }
        else
        {
            // Fallback: armazenamento local em wwwroot/uploads/
            services.AddScoped<IStorageService, LocalStorageService>();
        }

        services.AddHangfire(config => config
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UsePostgreSqlStorage(c => c.UseNpgsqlConnection(connectionString)));

        services.AddHangfireServer();

        return services;
    }
}
