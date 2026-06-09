using AgendaEstilo.Api.Endpoints;
using Microsoft.EntityFrameworkCore;
using AgendaEstilo.Api.Middleware;
using AgendaEstilo.Application;
using AgendaEstilo.Infrastructure;
using AgendaEstilo.Infrastructure.Jobs;
using Hangfire;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();

builder.Host.UseSerilog();

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

var jwtKey = builder.Configuration["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret not configured");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // MapInboundClaims = false garante que claims customizados como "tid" e "eid"
        // não sejam renomeados para tipos longos do .NET (ex: ClaimTypes.NameIdentifier).
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            NameClaimType = "sub"
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireSystemAdmin", policy =>
        policy.RequireClaim("sysRole", "Admin"));
    options.AddPolicy("RequireSystemPromoter", policy =>
        policy.RequireAssertion(ctx =>
            ctx.User.HasClaim("sysRole", "Admin") ||
            ctx.User.HasClaim("sysRole", "Promoter")));
});

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "AgendaEstilo API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? ["http://localhost:3000"])
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseExceptionHandler();
app.UseSerilogRequestLogging();
app.UseCors();

// Serve arquivos estáticos de wwwroot/ (usado pelo LocalStorageService para fotos em dev)
var wwwrootPath = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
Directory.CreateDirectory(wwwrootPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(wwwrootPath),
    RequestPath  = ""
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

app.UseHangfireDashboard("/hangfire");

// Job recorrente: lembretes a cada hora
RecurringJob.AddOrUpdate<SendRemindersJob>(
    "send-reminders",
    job => job.ExecuteAsync(CancellationToken.None),
    "0 * * * *");

app.MapAuthEndpoints();
app.MapBookingEndpoints();
app.MapProfessionalEndpoints();
app.MapServiceEndpoints();
app.MapClientEndpoints();
app.MapReportEndpoints();
app.MapPublicEndpoints();
app.MapDashboardEndpoints();
app.MapNotificationSettingsEndpoints();
app.MapEstablishmentEndpoints();
app.MapProfessionalPortalEndpoints();
app.MapAdminEndpoints();

// ── Seed: garante que existe ao menos 1 admin no banco ───────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AgendaEstilo.Infrastructure.Persistence.AppDbContext>();
    await db.Database.MigrateAsync();

    if (!db.SystemUsers.Any(u => u.Role == 0))
    {
        var adminPass = builder.Configuration["Admin:InitialPassword"] ?? "Admin@2025!";
        db.SystemUsers.Add(new AgendaEstilo.Domain.Entities.SystemUser
        {
            Name               = "Admin",
            Email              = builder.Configuration["Admin:Email"] ?? "admin@agendaestilo.com.br",
            PasswordHash       = BCrypt.Net.BCrypt.HashPassword(adminPass),
            Role               = 0, // Admin
            IsActive           = true,
            MustChangePassword = true,
        });
        await db.SaveChangesAsync();
    }
}

app.Run();
