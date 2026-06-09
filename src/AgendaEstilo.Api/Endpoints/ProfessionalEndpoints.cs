using System.Text.Json;
using AgendaEstilo.Application.Common;
using AgendaEstilo.Application.Professionals.Commands;
using AgendaEstilo.Application.Professionals.Queries;
using AgendaEstilo.Domain.Entities;
using AgendaEstilo.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Api.Endpoints;

public static class ProfessionalEndpoints
{
    public static void MapProfessionalEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/professionals").WithTags("Professionals").RequireAuthorization();

        group.MapGet("/", async ([FromQuery] Guid establishmentId, IMediator mediator) =>
        {
            var result = await mediator.Send(new GetProfessionalsQuery(establishmentId));
            return Results.Ok(result);
        });

        group.MapPost("/", async (UpsertProfessionalCommand command, IMediator mediator) =>
        {
            var result = await mediator.Send(command);
            return Results.Ok(new
            {
                id          = result.Id,
                isActive    = result.IsActive,
                planWarning = result.PlanWarning
            });
        });

        group.MapPut("/{id:guid}", async (Guid id, UpsertProfessionalCommand command, IMediator mediator) =>
        {
            var result = await mediator.Send(command with { Id = id });
            return Results.Ok(new
            {
                id          = result.Id,
                isActive    = result.IsActive,
                planWarning = result.PlanWarning
            });
        });

        group.MapPatch("/{id:guid}/toggle-active", async (Guid id, IMediator mediator) =>
        {
            var isActive = await mediator.Send(new ToggleProfessionalActiveCommand(id));
            return Results.Ok(new { isActive });
        });

        group.MapDelete("/{id:guid}", async (Guid id, IMediator mediator) =>
        {
            await mediator.Send(new DeleteProfessionalCommand(id));
            return Results.NoContent();
        });

        // Upload de foto — multipart/form-data, campo "photo"
        group.MapPost("/{id:guid}/photo", async (Guid id, HttpContext ctx, IMediator mediator, CancellationToken ct) =>
        {
            var form = await ctx.Request.ReadFormAsync(ct);
            var file = form.Files["photo"];

            if (file == null || file.Length == 0)
                return Results.BadRequest(new { detail = "Arquivo de foto não encontrado." });

            if (file.Length > 2 * 1024 * 1024)
                return Results.BadRequest(new { detail = "Foto não pode ultrapassar 2 MB." });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext is not (".jpg" or ".jpeg" or ".png" or ".webp"))
                return Results.BadRequest(new { detail = "Formato não suportado. Use JPG, PNG ou WebP." });

            await using var stream = file.OpenReadStream();
            var url = await mediator.Send(
                new UploadProfessionalPhotoCommand(id, stream, file.FileName, file.ContentType), ct);

            return Results.Ok(new { photoUrl = url });
        }).DisableAntiforgery();

        // Gerenciar vínculos profissional × serviço
        group.MapPut("/{id:guid}/services", async (
            Guid id, SetServicesRequest body, IMediator mediator) =>
        {
            await mediator.Send(new SetProfessionalServicesCommand(id, body.ServiceIds));
            return Results.NoContent();
        });

        // ── Agenda semanal ───────────────────────────────────────────────────

        // GET /api/professionals/{id}/schedule
        group.MapGet("/{id:guid}/schedule", async (
            Guid id, HttpContext ctx, IAppDbContext db) =>
        {
            var estId = GetEstId(ctx);
            if (estId == null) return Results.Unauthorized();

            var professional = await db.Professionals
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(p => p.Id == id && p.EstablishmentId == estId && !p.IsDeleted);
            if (professional == null) return Results.NotFound();

            // Horários do estabelecimento (constraints)
            var establishment = await db.Establishments
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(e => e.Id == estId && !e.IsDeleted);

            var estHours = ParseEstHours(establishment?.WorkingHoursJson);

            // Disponibilidades do profissional
            var avails = await db.Availabilities
                .IgnoreQueryFilters()
                .Where(a => a.ProfessionalId == id && !a.IsDeleted)
                .ToListAsync();

            // Montar os 7 dias da semana
            var schedule = Enumerable.Range(0, 7).Select(dow =>
            {
                var avail = avails.FirstOrDefault(a => (int)a.DayOfWeek == dow);
                var est   = estHours.FirstOrDefault(e => e.DayOfWeek == dow);
                return new ScheduleDayDto(
                    DayOfWeek : dow,
                    EstIsOpen  : est?.IsOpen ?? true,
                    EstStart   : est?.StartTime,
                    EstEnd     : est?.EndTime,
                    IsWorking  : avail?.IsActive ?? false,
                    StartTime  : avail?.IsActive == true ? avail.StartTime.ToString("HH:mm") : null,
                    EndTime    : avail?.IsActive == true ? avail.EndTime.ToString("HH:mm")   : null,
                    Breaks     : ParseBreaks(avail?.BreaksJson)
                );
            }).ToList();

            return Results.Ok(new { schedule });
        });

        // PUT /api/professionals/{id}/schedule
        group.MapPut("/{id:guid}/schedule", async (
            Guid id, UpdateScheduleRequest body, HttpContext ctx, IAppDbContext db) =>
        {
            var estId = GetEstId(ctx);
            if (estId == null) return Results.Unauthorized();

            var professional = await db.Professionals
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(p => p.Id == id && p.EstablishmentId == estId && !p.IsDeleted);
            if (professional == null) return Results.NotFound();

            var establishment = await db.Establishments
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(e => e.Id == estId && !e.IsDeleted);
            var estHours = ParseEstHours(establishment?.WorkingHoursJson);

            // Validação: horários do profissional devem estar dentro do estabelecimento
            foreach (var day in body.Schedule.Where(d => d.IsWorking))
            {
                var est = estHours.FirstOrDefault(e => e.DayOfWeek == day.DayOfWeek);
                if (est != null && !est.IsOpen)
                    return Results.BadRequest(new
                    {
                        detail = $"O estabelecimento não funciona no dia {DayName(day.DayOfWeek)}."
                    });

                if (!TimeOnly.TryParse(day.StartTime, out var profStart) ||
                    !TimeOnly.TryParse(day.EndTime,   out var profEnd))
                    return Results.BadRequest(new { detail = "Horário inválido." });

                if (est != null)
                {
                    if (est.StartTime != null && TimeOnly.TryParse(est.StartTime, out var estStart) &&
                        profStart < estStart)
                        return Results.BadRequest(new
                        {
                            detail = $"{DayName(day.DayOfWeek)}: horário de início anterior ao funcionamento do estabelecimento ({est.StartTime})."
                        });

                    if (est.EndTime != null && TimeOnly.TryParse(est.EndTime, out var estEnd) &&
                        profEnd > estEnd)
                        return Results.BadRequest(new
                        {
                            detail = $"{DayName(day.DayOfWeek)}: horário de término posterior ao fechamento do estabelecimento ({est.EndTime})."
                        });
                }
            }

            // Upsert Availability por dia da semana
            var existing = await db.Availabilities
                .IgnoreQueryFilters()
                .Where(a => a.ProfessionalId == id && !a.IsDeleted)
                .ToListAsync();

            foreach (var day in body.Schedule)
            {
                var avail = existing.FirstOrDefault(a => (int)a.DayOfWeek == day.DayOfWeek);

                if (avail == null)
                {
                    avail = new Availability
                    {
                        ProfessionalId = id,
                        TenantId = professional.TenantId,
                        DayOfWeek = (DayOfWeek)day.DayOfWeek,
                        StartTime = TimeOnly.Parse(day.StartTime ?? "09:00"),
                        EndTime   = TimeOnly.Parse(day.EndTime   ?? "18:00"),
                        IsActive  = day.IsWorking,
                        BreaksJson = SerializeBreaks(day.Breaks),
                    };
                    db.Availabilities.Add(avail);
                }
                else
                {
                    avail.IsActive   = day.IsWorking;
                    if (day.IsWorking && day.StartTime != null)
                        avail.StartTime = TimeOnly.Parse(day.StartTime);
                    if (day.IsWorking && day.EndTime != null)
                        avail.EndTime = TimeOnly.Parse(day.EndTime);
                    avail.BreaksJson = SerializeBreaks(day.Breaks);
                }
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Agenda atualizada." });
        });

        // ── Bloqueios / ausências ─────────────────────────────────────────────

        // GET /api/professionals/{id}/blocks
        group.MapGet("/{id:guid}/blocks", async (
            Guid id, HttpContext ctx, IAppDbContext db,
            [FromQuery] string? from = null) =>
        {
            var estId = GetEstId(ctx);
            if (estId == null) return Results.Unauthorized();

            var professional = await db.Professionals
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(p => p.Id == id && p.EstablishmentId == estId && !p.IsDeleted);
            if (professional == null) return Results.NotFound();

            var since = from != null && DateOnly.TryParse(from, out var d) ? d : DateOnly.FromDateTime(DateTime.Today);

            var blocks = await db.BlockedSlots
                .IgnoreQueryFilters()
                .Where(b => b.ProfessionalId == id && !b.IsDeleted &&
                            (b.DateEnd ?? b.Date) >= since)
                .OrderBy(b => b.Date)
                .Select(b => new BlockDto(
                    b.Id,
                    b.Date.ToString("yyyy-MM-dd"),
                    b.DateEnd != null ? b.DateEnd.Value.ToString("yyyy-MM-dd") : null,
                    b.IsFullDay,
                    b.IsFullDay ? null : b.StartTime.ToString("HH:mm"),
                    b.IsFullDay ? null : b.EndTime.ToString("HH:mm"),
                    b.Reason,
                    b.BlockType))
                .ToListAsync();

            return Results.Ok(new { blocks });
        });

        // POST /api/professionals/{id}/blocks
        group.MapPost("/{id:guid}/blocks", async (
            Guid id, CreateBlockRequest body, HttpContext ctx, IAppDbContext db) =>
        {
            var estId = GetEstId(ctx);
            if (estId == null) return Results.Unauthorized();

            var professional = await db.Professionals
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(p => p.Id == id && p.EstablishmentId == estId && !p.IsDeleted);
            if (professional == null) return Results.NotFound();

            if (!DateOnly.TryParse(body.DateStart, out var dateStart))
                return Results.BadRequest(new { detail = "Data inválida." });

            var dateEnd = body.DateEnd != null && DateOnly.TryParse(body.DateEnd, out var de)
                ? de : dateStart;

            if (dateEnd < dateStart)
                return Results.BadRequest(new { detail = "Data final deve ser maior ou igual à data inicial." });

            // Verifica conflito com agendamentos existentes
            var dateStartDt = dateStart.ToDateTime(TimeOnly.MinValue);
            var dateEndDt   = dateEnd.ToDateTime(TimeOnly.MaxValue);

            var conflicting = await db.Bookings
                .IgnoreQueryFilters()
                .Where(b =>
                    b.ProfessionalId == id &&
                    !b.IsDeleted &&
                    b.Status != BookingStatus.Cancelado &&
                    b.Status != BookingStatus.NaoCompareceu &&
                    b.ScheduledAt >= dateStartDt &&
                    b.ScheduledAt <= dateEndDt)
                .Select(b => new { b.ScheduledAt })
                .ToListAsync();

            if (conflicting.Count > 0)
            {
                var dates = conflicting
                    .Select(b => DateOnly.FromDateTime(b.ScheduledAt).ToString("dd/MM"))
                    .Distinct()
                    .Take(3);
                return Results.Conflict(new
                {
                    detail = $"Existem agendamentos no período: {string.Join(", ", dates)}. Cancele-os antes de bloquear."
                });
            }

            TimeOnly startTime = default, endTime = default;
            if (!body.IsFullDay)
            {
                if (!TimeOnly.TryParse(body.StartTime, out startTime) ||
                    !TimeOnly.TryParse(body.EndTime,   out endTime))
                    return Results.BadRequest(new { detail = "Horário inválido para bloqueio parcial." });
            }

            var block = new BlockedSlot
            {
                ProfessionalId = id,
                TenantId       = professional.TenantId,
                Date           = dateStart,
                DateEnd        = dateEnd == dateStart ? null : dateEnd,
                IsFullDay      = body.IsFullDay,
                StartTime      = startTime,
                EndTime        = endTime,
                Reason         = body.Reason?.Trim(),
                BlockType      = body.BlockType ?? "timeoff",
            };

            db.BlockedSlots.Add(block);
            await db.SaveChangesAsync();
            return Results.Ok(new { id = block.Id });
        });

        // ── Acesso do profissional ───────────────────────────────────────────────

        // POST /api/professionals/{id}/access → ativa conta de acesso
        group.MapPost("/{id:guid}/access", async (Guid id, IMediator mediator) =>
        {
            var result = await mediator.Send(new ActivateProfessionalAccessCommand(id));
            return Results.Ok(new {
                login    = result.Login,
                password = result.Password,
                whatsapp = result.WhatsApp,
                message  = $"Acesso ativado. Envie ao profissional: Login: {result.Login} | Senha: {result.Password}",
            });
        });

        // DELETE /api/professionals/{id}/access → revoga acesso
        group.MapDelete("/{id:guid}/access", async (Guid id, IMediator mediator) =>
        {
            await mediator.Send(new RevokeProfessionalAccessCommand(id));
            return Results.NoContent();
        });

        // DELETE /api/professionals/{id}/blocks/{blockId}
        group.MapDelete("/{id:guid}/blocks/{blockId:guid}", async (
            Guid id, Guid blockId, HttpContext ctx, IAppDbContext db) =>
        {
            var estId = GetEstId(ctx);
            if (estId == null) return Results.Unauthorized();

            var professional = await db.Professionals
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(p => p.Id == id && p.EstablishmentId == estId && !p.IsDeleted);
            if (professional == null) return Results.NotFound();

            var block = await db.BlockedSlots
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(b => b.Id == blockId && b.ProfessionalId == id && !b.IsDeleted);
            if (block == null) return Results.NotFound();

            block.IsDeleted = true;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static Guid? GetEstId(HttpContext ctx)
    {
        var eid = ctx.User.FindFirst("eid")?.Value;
        return Guid.TryParse(eid, out var id) ? id : null;
    }

    private static string DayName(int dow) => dow switch
    {
        0 => "Domingo", 1 => "Segunda-feira", 2 => "Terça-feira", 3 => "Quarta-feira",
        4 => "Quinta-feira", 5 => "Sexta-feira", 6 => "Sábado", _ => "dia"
    };

    private static List<EstDayHours> ParseEstHours(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<EstDayHours>>(json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
        }
        catch { return []; }
    }

    private static List<BreakDto> ParseBreaks(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<BreakDto>>(json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
        }
        catch { return []; }
    }

    private static string? SerializeBreaks(List<BreakDto>? breaks)
    {
        if (breaks == null || breaks.Count == 0) return null;
        return JsonSerializer.Serialize(breaks);
    }
}

// ── DTOs ─────────────────────────────────────────────────────────────────────
file record SetServicesRequest(List<Guid> ServiceIds);

file record ScheduleDayDto(
    int DayOfWeek,
    bool EstIsOpen,
    string? EstStart,
    string? EstEnd,
    bool IsWorking,
    string? StartTime,
    string? EndTime,
    List<BreakDto> Breaks);

internal record BreakDto(
    string Id,
    string Label,
    string StartTime,
    string EndTime);

file record ScheduleDayInput(
    int DayOfWeek,
    bool IsWorking,
    string? StartTime,
    string? EndTime,
    List<BreakDto>? Breaks);

file record UpdateScheduleRequest(List<ScheduleDayInput> Schedule);

file record BlockDto(
    Guid Id,
    string DateStart,
    string? DateEnd,
    bool IsFullDay,
    string? StartTime,
    string? EndTime,
    string? Reason,
    string BlockType);

file record CreateBlockRequest(
    string DateStart,
    string? DateEnd,
    bool IsFullDay,
    string? StartTime,
    string? EndTime,
    string? Reason,
    string? BlockType);

internal record EstDayHours(int DayOfWeek, bool IsOpen, string? StartTime, string? EndTime);
