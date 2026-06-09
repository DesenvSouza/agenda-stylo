using AgendaEstilo.Application.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Slots.Queries;

/// <summary>
/// Retorna os dias do mês que possuem ao menos potencial de disponibilidade.
/// Verificação leve: estabelecimento aberto + profissional com Availability no dia da semana
/// + sem bloqueio de dia inteiro. Não computa slots individuais.
/// </summary>
public record GetAvailableDaysQuery(
    string Slug,
    Guid? ServiceId,
    Guid? ProfessionalId,
    int Year,
    int Month) : IRequest<List<int>>;

public class GetAvailableDaysQueryHandler : IRequestHandler<GetAvailableDaysQuery, List<int>>
{
    private readonly IAppDbContext _db;

    public GetAvailableDaysQueryHandler(IAppDbContext db) => _db = db;

    public async Task<List<int>> Handle(GetAvailableDaysQuery request, CancellationToken ct)
    {
        var establishment = await _db.Establishments
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(e => e.Slug == request.Slug && e.IsActive && !e.IsDeleted, ct);

        if (establishment == null) return [];

        // Profissionais que atendem o serviço (ou todos se serviceId não informado)
        var profsQuery = _db.Professionals
            .IgnoreQueryFilters()
            .Where(p => p.EstablishmentId == establishment.Id && p.IsActive && !p.IsDeleted);

        if (request.ProfessionalId.HasValue && request.ProfessionalId != Guid.Empty)
            profsQuery = profsQuery.Where(p => p.Id == request.ProfessionalId.Value);
        else if (request.ServiceId.HasValue && request.ServiceId != Guid.Empty)
            profsQuery = profsQuery.Where(p =>
                _db.ProfessionalServices
                    .IgnoreQueryFilters()
                    .Any(ps => ps.ProfessionalId == p.Id && ps.ServiceId == request.ServiceId.Value));

        var profIds = await profsQuery.Select(p => p.Id).ToListAsync(ct);
        if (profIds.Count == 0) return [];

        // Disponibilidades por profissional × dia-da-semana
        var availabilities = await _db.Availabilities
            .IgnoreQueryFilters()
            .Where(a => profIds.Contains(a.ProfessionalId) && a.IsActive)
            .Select(a => new { a.ProfessionalId, a.DayOfWeek })
            .ToListAsync(ct);

        // Bloqueios de dia inteiro no mês
        var monthStart = new DateOnly(request.Year, request.Month, 1);
        var monthEnd   = monthStart.AddMonths(1).AddDays(-1);

        var fullDayBlocks = await _db.BlockedSlots
            .IgnoreQueryFilters()
            .Where(b =>
                profIds.Contains(b.ProfessionalId) &&
                !b.IsDeleted &&
                b.IsFullDay &&
                b.Date <= monthEnd &&
                (b.DateEnd == null ? b.Date >= monthStart : b.DateEnd >= monthStart))
            .Select(b => new { b.ProfessionalId, b.Date, b.DateEnd })
            .ToListAsync(ct);

        // Parse horários de funcionamento do estabelecimento
        var workingHours = ParseWorkingHours(establishment.WorkingHoursJson);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var availableDays = new List<int>();

        for (var day = 1; day <= DateTime.DaysInMonth(request.Year, request.Month); day++)
        {
            var date = new DateOnly(request.Year, request.Month, day);
            if (date < today) continue; // passado: sempre disabled

            var dow = date.DayOfWeek;

            // Verifica se estabelecimento abre neste dia
            if (workingHours.TryGetValue((int)dow, out var dayHours) && !dayHours)
                continue;

            // Verifica se algum profissional tem disponibilidade neste dia da semana
            // e não está com bloqueio de dia inteiro nesta data
            var hasAvail = profIds.Any(profId =>
            {
                var hasAvailEntry = availabilities.Any(a =>
                    a.ProfessionalId == profId && a.DayOfWeek == dow);

                if (!hasAvailEntry) return false;

                var isFullyBlocked = fullDayBlocks.Any(b =>
                    b.ProfessionalId == profId &&
                    b.Date <= date &&
                    (b.DateEnd == null ? b.Date == date : b.DateEnd >= date));

                return !isFullyBlocked;
            });

            if (hasAvail) availableDays.Add(day);
        }

        return availableDays;
    }

    private static Dictionary<int, bool> ParseWorkingHours(string? json)
    {
        // Retorna dict[dayOfWeek] = isOpen; se json nulo → tudo aberto
        if (string.IsNullOrWhiteSpace(json)) return new Dictionary<int, bool>();
        try
        {
            var opts = new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var days = System.Text.Json.JsonSerializer
                .Deserialize<List<WorkingHoursEntry>>(json, opts);
            return days?.ToDictionary(d => d.DayOfWeek, d => d.IsOpen)
                   ?? new Dictionary<int, bool>();
        }
        catch { return new Dictionary<int, bool>(); }
    }
}

file record WorkingHoursEntry(int DayOfWeek, bool IsOpen, string? OpenTime, string? CloseTime);
