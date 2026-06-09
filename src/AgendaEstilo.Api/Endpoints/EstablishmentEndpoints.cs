using System.Text.Json;
using AgendaEstilo.Application.Common;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Api.Endpoints;

public static class EstablishmentEndpoints
{
    // Padrão: seg-sex 08:00-18:00, sáb 08:00-13:00, dom fechado
    static readonly BusinessHoursDay[] DefaultHours =
    [
        new(0, false, "08:00", "18:00"), // Domingo
        new(1, true,  "08:00", "18:00"), // Segunda
        new(2, true,  "08:00", "18:00"), // Terça
        new(3, true,  "08:00", "18:00"), // Quarta
        new(4, true,  "08:00", "18:00"), // Quinta
        new(5, true,  "08:00", "18:00"), // Sexta
        new(6, true,  "08:00", "13:00"), // Sábado
    ];

    static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public static void MapEstablishmentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/establishments")
            .WithTags("Establishments")
            .RequireAuthorization();

        // GET /api/establishments/profile → perfil público editável
        group.MapGet("/profile", async (HttpContext ctx, IAppDbContext db) =>
        {
            var est = await ResolveEstablishment(ctx, db);
            if (est is null) return Results.NotFound();
            return Results.Ok(new {
                name        = est.Name,
                category    = (int)est.Category,
                phone       = est.Phone,
                description = est.Description,
                coverImageUrl = est.CoverImageUrl,
                address     = est.Address,
                contactEmail = est.ContactEmail,
            });
        });

        // PUT /api/establishments/profile
        group.MapPut("/profile", async (HttpContext ctx, UpdateProfileRequest body, IAppDbContext db) =>
        {
            var est = await ResolveEstablishment(ctx, db);
            if (est is null) return Results.NotFound();

            if (!string.IsNullOrWhiteSpace(body.Name))   est.Name        = body.Name.Trim();
            if (body.Phone       is not null) est.Phone        = body.Phone.Trim();
            if (body.Description is not null) est.Description  = string.IsNullOrWhiteSpace(body.Description) ? null : body.Description.Trim();
            if (body.CoverImageUrl is not null) est.CoverImageUrl = string.IsNullOrWhiteSpace(body.CoverImageUrl) ? null : body.CoverImageUrl.Trim();
            if (body.Address     is not null) est.Address      = string.IsNullOrWhiteSpace(body.Address) ? null : body.Address.Trim();
            if (body.ContactEmail is not null) est.ContactEmail = string.IsNullOrWhiteSpace(body.ContactEmail) ? null : body.ContactEmail.Trim();
            if (body.Category.HasValue) est.Category = (AgendaEstilo.Domain.Enums.EstablishmentCategory)body.Category.Value;

            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // GET /api/establishments/professional-access → { allowed: bool }
        group.MapGet("/professional-access", async (HttpContext ctx, IAppDbContext db) =>
        {
            var est = await ResolveEstablishment(ctx, db);
            if (est is null) return Results.NotFound();
            return Results.Ok(new { allowed = est.AllowProfessionalAccess });
        });

        // PATCH /api/establishments/professional-access → toggle
        group.MapPatch("/professional-access", async (
            HttpContext ctx, [Microsoft.AspNetCore.Mvc.FromBody] ProfAccessRequest body, IAppDbContext db) =>
        {
            var est = await ResolveEstablishment(ctx, db);
            if (est is null) return Results.NotFound();
            est.AllowProfessionalAccess = body.Allowed;
            await db.SaveChangesAsync();
            return Results.Ok(new { allowed = est.AllowProfessionalAccess });
        });

        // GET /api/establishments/hours → { hours: [...] }
        group.MapGet("/hours", async (HttpContext ctx, IAppDbContext db) =>
        {
            var est = await ResolveEstablishment(ctx, db);
            if (est is null) return Results.NotFound();

            if (!string.IsNullOrWhiteSpace(est.WorkingHoursJson))
            {
                try
                {
                    var stored = JsonSerializer.Deserialize<BusinessHoursDay[]>(
                        est.WorkingHoursJson, JsonOpts);
                    if (stored is { Length: 7 })
                        return Results.Ok(new { hours = stored });
                }
                catch { /* fallback to defaults */ }
            }

            return Results.Ok(new { hours = DefaultHours });
        });

        // PUT /api/establishments/hours  body: { hours: [...] }
        group.MapPut("/hours", async (HttpContext ctx, UpdateHoursRequest body, IAppDbContext db) =>
        {
            if (body.Hours is not { Count: 7 })
                return Results.BadRequest(new { detail = "Informe os horários para os 7 dias da semana." });

            var est = await ResolveEstablishment(ctx, db);
            if (est is null) return Results.NotFound();

            est.WorkingHoursJson = JsonSerializer.Serialize(body.Hours, JsonOpts);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    // Busca o estabelecimento pelo claim "eid" do JWT, ignorando o query filter de tenant,
    // para evitar falsos 404 caso o TenantService não resolva corretamente no contexto do endpoint.
    private static async Task<AgendaEstilo.Domain.Entities.Establishment?> ResolveEstablishment(
        HttpContext ctx, IAppDbContext db)
    {
        var eid = ctx.User.FindFirst("eid")?.Value;
        if (!Guid.TryParse(eid, out var estId)) return null;

        return await db.Establishments
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(e => e.Id == estId && !e.IsDeleted);
    }
}

internal record BusinessHoursDay(int DayOfWeek, bool IsOpen, string OpenTime, string CloseTime);
file record UpdateHoursRequest(List<BusinessHoursDay> Hours);
file record ProfAccessRequest(bool Allowed);
file record UpdateProfileRequest(
    string? Name, int? Category, string? Phone,
    string? Description, string? CoverImageUrl,
    string? Address, string? ContactEmail);
