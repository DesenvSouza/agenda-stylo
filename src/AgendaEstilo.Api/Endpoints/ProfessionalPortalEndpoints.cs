using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace AgendaEstilo.Api.Endpoints;

/// <summary>
/// Endpoints exclusivos para o profissional logado (role = Profissional).
/// Todas as rotas requerem autenticação e role Profissional.
/// </summary>
public static class ProfessionalPortalEndpoints
{
    static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public static void MapProfessionalPortalEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/professional")
            .WithTags("ProfessionalPortal")
            .RequireAuthorization();

        // ── GET /api/professional/me ─────────────────────────────────────────
        group.MapGet("/me", async (HttpContext ctx, IAppDbContext db) =>
        {
            var (profId, estId) = GetIds(ctx);
            if (profId == Guid.Empty) return Results.Forbid();

            var p = await db.Professionals
                .IgnoreQueryFilters()
                .Include(x => x.ProfessionalServices)
                .FirstOrDefaultAsync(x => x.Id == profId && x.EstablishmentId == estId && !x.IsDeleted);

            if (p is null) return Results.NotFound();

            return Results.Ok(new {
                id = p.Id,
                name = p.Name,
                specialty = p.Specialty,
                bio = p.Bio,
                photoUrl = p.PhotoUrl,
                whatsapp = p.WhatsApp,
                cpf = p.Cpf,
                serviceIds = p.ProfessionalServices.Select(ps => ps.ServiceId).ToList(),
            });
        });

        // ── PUT /api/professional/me ─────────────────────────────────────────
        group.MapPut("/me", async (HttpContext ctx, [FromBody] UpdateSelfRequest body, IAppDbContext db) =>
        {
            var (profId, estId) = GetIds(ctx);
            if (profId == Guid.Empty) return Results.Forbid();

            var p = await db.Professionals
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(x => x.Id == profId && x.EstablishmentId == estId && !x.IsDeleted);

            if (p is null) return Results.NotFound();

            if (!string.IsNullOrWhiteSpace(body.Name))     p.Name     = body.Name.Trim();
            if (body.Specialty is not null) p.Specialty = string.IsNullOrWhiteSpace(body.Specialty) ? null : body.Specialty.Trim();
            if (body.Bio is not null)       p.Bio       = string.IsNullOrWhiteSpace(body.Bio)       ? null : body.Bio.Trim();

            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // ── GET /api/professional/me/bookings ────────────────────────────────
        group.MapGet("/me/bookings", async (
            HttpContext ctx,
            [FromQuery] string? status,
            [FromQuery] string? dateFrom,
            [FromQuery] string? dateTo,
            [FromQuery] int page = 1,
            IAppDbContext db = null!) =>
        {
            var (profId, _) = GetIds(ctx);
            if (profId == Guid.Empty) return Results.Forbid();

            var query = db.Bookings
                .IgnoreQueryFilters()
                .Include(b => b.Service)
                .Include(b => b.Client)
                .Where(b => b.ProfessionalId == profId && !b.IsDeleted);

            if (int.TryParse(status, out var s) && s > 0)
                query = query.Where(b => (int)b.Status == s);

            if (DateOnly.TryParse(dateFrom, out var df))
                query = query.Where(b => DateOnly.FromDateTime(b.ScheduledAt) >= df);
            if (DateOnly.TryParse(dateTo,   out var dt))
                query = query.Where(b => DateOnly.FromDateTime(b.ScheduledAt) <= dt);

            var total = await query.CountAsync();
            var pageSize = 20;
            var bookings = await query
                .OrderByDescending(b => b.ScheduledAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Results.Ok(new {
                total,
                page,
                pageSize,
                items = bookings.Select(b => new {
                    id = b.Id,
                    clientName = b.Client?.Name ?? "",
                    clientPhone = b.Client?.Phone ?? "",
                    serviceName = b.Service?.Name ?? "",
                    scheduledAt = b.ScheduledAt,
                    endsAt = b.EndsAt,
                    status = (int)b.Status,
                    cancelToken = b.CancelToken,
                }),
            });
        });

        // ── GET /api/professional/me/schedule ────────────────────────────────
        group.MapGet("/me/schedule", async (HttpContext ctx, IAppDbContext db) =>
        {
            var (profId, estId) = GetIds(ctx);
            if (profId == Guid.Empty) return Results.Forbid();

            var est = await db.Establishments
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(e => e.Id == estId);

            var workingHours = DeserializeHours(est?.WorkingHoursJson);

            var availabilities = await db.Availabilities
                .IgnoreQueryFilters()
                .Where(a => a.ProfessionalId == profId && a.IsActive)
                .ToListAsync();

            var schedule = Enumerable.Range(0, 7).Select(dow =>
            {
                var estDay = workingHours?.FirstOrDefault(h => h.DayOfWeek == dow);
                var avail  = availabilities.FirstOrDefault(a => a.DayOfWeek == (DayOfWeek)dow);
                return new {
                    dayOfWeek  = dow,
                    estIsOpen  = estDay?.IsOpen ?? true,
                    estStart   = estDay?.OpenTime,
                    estEnd     = estDay?.CloseTime,
                    isWorking  = avail is not null,
                    startTime  = avail?.StartTime.ToString("HH:mm"),
                    endTime    = avail?.EndTime.ToString("HH:mm"),
                };
            });

            return Results.Ok(new { schedule });
        });

        // ── GET /api/professional/me/establishment ───────────────────────────
        // Info básica do estabelecimento (nome, slug, endereço)
        group.MapGet("/me/establishment", async (HttpContext ctx, IAppDbContext db) =>
        {
            var (_, estId) = GetIds(ctx);
            if (estId == Guid.Empty) return Results.Forbid();

            var est = await db.Establishments
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(e => e.Id == estId);

            if (est is null) return Results.NotFound();
            return Results.Ok(new {
                name    = est.Name,
                slug    = est.Slug,
                address = est.Address,
                phone   = est.Phone,
            });
        });

        // ── GET /api/professional/me/report ──────────────────────────────────
        group.MapGet("/me/report", async (
            HttpContext ctx,
            [FromQuery] string period = "month",
            IAppDbContext db = null!) =>
        {
            var (profId, _) = GetIds(ctx);
            if (profId == Guid.Empty) return Results.Forbid();

            var utcNow = DateTime.UtcNow;
            var from = period switch {
                "day"   => utcNow.Date,
                "week"  => utcNow.Date.AddDays(-(int)utcNow.DayOfWeek),
                "year"  => new DateTime(utcNow.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                _       => new DateTime(utcNow.Year, utcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc), // month
            };

            var bookings = await db.Bookings
                .IgnoreQueryFilters()
                .Include(b => b.Service)
                .Include(b => b.Client)
                .Where(b =>
                    b.ProfessionalId == profId &&
                    !b.IsDeleted &&
                    b.Status == BookingStatus.Concluido &&
                    b.ScheduledAt >= from)
                .ToListAsync();

            var revenue  = bookings.Sum(b => b.Service?.Price ?? 0);
            var count    = bookings.Count;
            var topClients = bookings
                .GroupBy(b => b.ClientId)
                .Select(g => new {
                    clientId   = g.Key,
                    name       = g.First().Client?.Name ?? "",
                    phone      = g.First().Client?.Phone ?? "",
                    visitCount = g.Count(),
                    totalSpent = g.Sum(b => b.Service?.Price ?? 0),
                    lastVisit  = g.Max(b => b.ScheduledAt),
                })
                .OrderByDescending(c => c.visitCount)
                .Take(10)
                .ToList();

            return Results.Ok(new { period, from, revenue, count, topClients });
        });
    }

    private static (Guid ProfId, Guid EstId) GetIds(HttpContext ctx)
    {
        Guid.TryParse(ctx.User.FindFirst("pid")?.Value, out var profId);
        Guid.TryParse(ctx.User.FindFirst("eid")?.Value, out var estId);
        return (profId, estId);
    }

    private static List<BusinessHoursDay>? DeserializeHours(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonSerializer.Deserialize<List<BusinessHoursDay>>(json, JsonOpts); }
        catch { return null; }
    }
}

file record UpdateSelfRequest(string? Name, string? Specialty, string? Bio);
