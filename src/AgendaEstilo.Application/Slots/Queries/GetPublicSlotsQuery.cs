using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Entities;
using AgendaEstilo.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Slots.Queries;

// ── DTOs ────────────────────────────────────────────────────────────────────

public record ProfessionalSlotsDto(
    Guid ProfessionalId,
    string ProfessionalName,
    DateOnly Date,
    List<string> Slots);

public record AggregatedSlotDto(
    string Time,
    List<SlotProfessionalDto> AvailableProfessionals);

public record SlotProfessionalDto(Guid Id, string Name, string? PhotoUrl);

// ── Queries ──────────────────────────────────────────────────────────────────

public record GetProfessionalSlotsQuery(
    string Slug,
    Guid ServiceId,
    Guid ProfessionalId,
    DateOnly Date) : IRequest<ProfessionalSlotsDto?>;

public record GetAggregatedSlotsQuery(
    string Slug,
    Guid ServiceId,
    DateOnly Date) : IRequest<List<AggregatedSlotDto>>;

// ── Handler: profissional específico ────────────────────────────────────────

public class GetProfessionalSlotsQueryHandler
    : IRequestHandler<GetProfessionalSlotsQuery, ProfessionalSlotsDto?>
{
    private readonly IAppDbContext _db;
    private readonly ISlotCacheService _cache;

    public GetProfessionalSlotsQueryHandler(IAppDbContext db, ISlotCacheService cache)
        => (_db, _cache) = (db, cache);

    public async Task<ProfessionalSlotsDto?> Handle(
        GetProfessionalSlotsQuery request, CancellationToken ct)
    {
        var cacheKey = $"slots_{request.Slug}_{request.ServiceId}_{request.ProfessionalId}_{request.Date}";
        if (_cache.Get<ProfessionalSlotsDto>(cacheKey) is { } cached) return cached;

        var establishment = await _db.Establishments
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(e => e.Slug == request.Slug, ct);
        if (establishment == null) return null;

        var tz = SlotEngine.ResolveTimeZone(establishment.TimeZoneId);

        var ps = await _db.ProfessionalServices
            .IgnoreQueryFilters()
            .Include(x => x.Professional)
            .Include(x => x.Service)
            .FirstOrDefaultAsync(x =>
                x.ProfessionalId == request.ProfessionalId &&
                x.ServiceId == request.ServiceId &&
                x.Professional.EstablishmentId == establishment.Id &&
                x.Professional.IsActive, ct);

        if (ps == null) return null;

        var slots = await SlotEngine.ComputeAsync(
            ps.Professional, ps.Service, ps.CustomDuration, request.Date, tz, _db, ct,
            establishment.WorkingHoursJson);

        var result = new ProfessionalSlotsDto(
            ps.Professional.Id, ps.Professional.Name, request.Date, slots);

        _cache.Set(cacheKey, $"{establishment.Id}_{request.Date}", result, TimeSpan.FromSeconds(60));
        return result;
    }
}

// ── Handler: qualquer profissional (agregado) ────────────────────────────────

public class GetAggregatedSlotsQueryHandler
    : IRequestHandler<GetAggregatedSlotsQuery, List<AggregatedSlotDto>>
{
    private readonly IAppDbContext _db;
    private readonly ISlotCacheService _cache;

    public GetAggregatedSlotsQueryHandler(IAppDbContext db, ISlotCacheService cache)
        => (_db, _cache) = (db, cache);

    public async Task<List<AggregatedSlotDto>> Handle(
        GetAggregatedSlotsQuery request, CancellationToken ct)
    {
        var cacheKey = $"slots_{request.Slug}_{request.ServiceId}_any_{request.Date}";
        if (_cache.Get<List<AggregatedSlotDto>>(cacheKey) is { } cached) return cached;

        var establishment = await _db.Establishments
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(e => e.Slug == request.Slug, ct);
        if (establishment == null) return [];

        var tz = SlotEngine.ResolveTimeZone(establishment.TimeZoneId);

        var professionalServices = await _db.ProfessionalServices
            .IgnoreQueryFilters()
            .Include(x => x.Professional)
            .Include(x => x.Service)
            .Where(x =>
                x.ServiceId == request.ServiceId &&
                x.Professional.EstablishmentId == establishment.Id &&
                x.Professional.IsActive)
            .ToListAsync(ct);

        if (professionalServices.Count == 0) return [];

        // time → profissionais disponíveis
        var timeMap = new SortedDictionary<string, List<SlotProfessionalDto>>(StringComparer.Ordinal);

        foreach (var ps in professionalServices)
        {
            var slots = await SlotEngine.ComputeAsync(
                ps.Professional, ps.Service, ps.CustomDuration, request.Date, tz, _db, ct,
                establishment.WorkingHoursJson);

            foreach (var slot in slots)
            {
                if (!timeMap.TryGetValue(slot, out var list))
                    timeMap[slot] = list = [];
                list.Add(new SlotProfessionalDto(
                    ps.Professional.Id, ps.Professional.Name, ps.Professional.PhotoUrl));
            }
        }

        var result = timeMap
            .Select(kv => new AggregatedSlotDto(kv.Key, kv.Value))
            .ToList();

        _cache.Set(cacheKey, $"{establishment.Id}_{request.Date}", result, TimeSpan.FromSeconds(60));
        return result;
    }
}

// ── Motor de cálculo (lógica pura, compartilhada) ───────────────────────────

file static class SlotEngine
{
    private static readonly TimeSpan Buffer = TimeSpan.FromMinutes(30);

    internal static TimeZoneInfo ResolveTimeZone(string? id)
    {
        if (string.IsNullOrWhiteSpace(id)) return TimeZoneInfo.Utc;
        try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
        catch { return TimeZoneInfo.Utc; }
    }

    internal static async Task<List<string>> ComputeAsync(
        Professional professional,
        Service service,
        int? customDuration,
        DateOnly date,
        TimeZoneInfo tz,
        IAppDbContext db,
        CancellationToken ct,
        string? workingHoursJson = null)
    {
        // Verifica se o estabelecimento está aberto neste dia
        var (estIsOpen, estOpen, estClose) = ParseDayHours(workingHoursJson, date.DayOfWeek);
        if (!estIsOpen) return [];

        var availability = await db.Availabilities
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(a =>
                a.ProfessionalId == professional.Id &&
                a.DayOfWeek == date.DayOfWeek &&
                a.IsActive, ct);

        if (availability == null) return [];

        var bookings = await db.Bookings
            .IgnoreQueryFilters()
            .Where(b =>
                b.ProfessionalId == professional.Id &&
                b.Status != BookingStatus.Cancelado &&
                b.Status != BookingStatus.NaoCompareceu &&
                DateOnly.FromDateTime(b.ScheduledAt) == date)
            .Select(b => new { b.ScheduledAt, b.EndsAt })
            .ToListAsync(ct);

        // Bloqueios que cobrem esta data (suporte a intervalos: Date <= date <= DateEnd)
        var blockedSlots = await db.BlockedSlots
            .IgnoreQueryFilters()
            .Where(b =>
                b.ProfessionalId == professional.Id &&
                !b.IsDeleted &&
                b.Date <= date &&
                (b.DateEnd == null || b.DateEnd >= date))
            .ToListAsync(ct);

        // Bloqueio de dia inteiro → sem slots
        if (blockedSlots.Any(b => b.IsFullDay)) return [];

        return Calculate(availability, customDuration ?? service.DurationMinutes,
            bookings.Select(b => (b.ScheduledAt, b.EndsAt)).ToList(),
            blockedSlots
                .Where(b => !b.IsFullDay)
                .Select(b => (b.StartTime, b.EndTime)).ToList(),
            date, tz, estOpen, estClose);
    }

    private static List<string> Calculate(
        Availability availability,
        int durationMinutes,
        List<(DateTime ScheduledAt, DateTime EndsAt)> bookings,
        List<(TimeOnly StartTime, TimeOnly EndTime)> partialBlocks,
        DateOnly date,
        TimeZoneInfo tz,
        TimeOnly? estOpen = null,
        TimeOnly? estClose = null)
    {
        var duration = TimeSpan.FromMinutes(durationMinutes);
        var cutoffUtc = DateTime.UtcNow.Add(Buffer);

        var startUtc = ToUtc(date, availability.StartTime, tz);
        var endUtc   = ToUtc(date, availability.EndTime,   tz);

        // Limita janela ao horário de funcionamento do estabelecimento
        if (estOpen.HasValue)
        {
            var estStartUtc = ToUtc(date, estOpen.Value, tz);
            if (estStartUtc > startUtc) startUtc = estStartUtc;
        }
        if (estClose.HasValue)
        {
            var estEndUtc = ToUtc(date, estClose.Value, tz);
            if (estEndUtc < endUtc) endUtc = estEndUtc;
        }
        if (startUtc >= endUtc) return [];

        // Pausas recorrentes: primeiro tenta BreaksJson (múltiplas), depois legado BreakStart/BreakEnd
        var busyIntervals = new List<(DateTime Start, DateTime End)>();

        if (!string.IsNullOrWhiteSpace(availability.BreaksJson))
        {
            var breaks = ParseBreaksJson(availability.BreaksJson);
            busyIntervals.AddRange(breaks.Select(b =>
                (ToUtc(date, b.Start, tz), ToUtc(date, b.End, tz))));
        }
        else if (availability.BreakStart.HasValue && availability.BreakEnd.HasValue)
        {
            busyIntervals.Add((
                ToUtc(date, availability.BreakStart.Value, tz),
                ToUtc(date, availability.BreakEnd.Value,   tz)));
        }

        // Adiciona bloqueios parciais pontuais
        busyIntervals.AddRange(partialBlocks.Select(b =>
            (ToUtc(date, b.StartTime, tz), ToUtc(date, b.EndTime, tz))));

        var slots = new List<string>();
        var current = startUtc;

        while (current + duration <= endUtc)
        {
            var slotEnd = current + duration;

            // Passado + buffer de 30 min
            if (slotEnd <= cutoffUtc)
            { current += duration; continue; }

            // Sobreposição com pausa ou bloqueio
            if (busyIntervals.Any(i => current < i.End && slotEnd > i.Start))
            { current += duration; continue; }

            // Agendamento já existente
            if (bookings.Any(b => current < b.EndsAt && slotEnd > b.ScheduledAt))
            { current += duration; continue; }

            slots.Add(TimeZoneInfo.ConvertTimeFromUtc(current, tz).ToString("HH:mm"));
            current += duration;
        }

        return slots;
    }

    private static List<(TimeOnly Start, TimeOnly End)> ParseBreaksJson(string json)
    {
        try
        {
            var opts = new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var breaks = System.Text.Json.JsonSerializer.Deserialize<List<BreakEntry>>(json, opts);
            if (breaks == null) return [];
            return breaks
                .Where(b => TimeOnly.TryParse(b.StartTime, out _) && TimeOnly.TryParse(b.EndTime, out _))
                .Select(b => (TimeOnly.Parse(b.StartTime), TimeOnly.Parse(b.EndTime)))
                .ToList();
        }
        catch { return []; }
    }

    // Interpreta TimeOnly como horário local do estabelecimento → converte para UTC
    internal static DateTime ToUtc(DateOnly date, TimeOnly time, TimeZoneInfo tz)
    {
        var local = DateTime.SpecifyKind(date.ToDateTime(time), DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(local, tz);
    }

    // Lê WorkingHoursJson e retorna (isOpen, openTime?, closeTime?) para o dia da semana
    private static (bool IsOpen, TimeOnly? Open, TimeOnly? Close) ParseDayHours(
        string? json, DayOfWeek dayOfWeek)
    {
        if (string.IsNullOrWhiteSpace(json)) return (true, null, null);
        try
        {
            var opts = new System.Text.Json.JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };
            var days = System.Text.Json.JsonSerializer.Deserialize<List<BusinessHoursEntry>>(json, opts);
            var day = days?.FirstOrDefault(d => d.DayOfWeek == (int)dayOfWeek);
            if (day is null) return (true, null, null);
            if (!day.IsOpen) return (false, null, null);
            var open  = TimeOnly.TryParse(day.OpenTime,  out var o) ? o : (TimeOnly?)null;
            var close = TimeOnly.TryParse(day.CloseTime, out var c) ? c : (TimeOnly?)null;
            return (true, open, close);
        }
        catch { return (true, null, null); }
    }
}

// DTO interno para deserializar WorkingHoursJson
file record BusinessHoursEntry(int DayOfWeek, bool IsOpen, string? OpenTime, string? CloseTime);

// DTO interno para deserializar BreaksJson
file record BreakEntry(string StartTime, string EndTime, string? Label, string? Id);
