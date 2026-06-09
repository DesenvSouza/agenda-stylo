using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Enums;
using AgendaEstilo.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Reports.Queries;

public record ProfessionalCommissionDto(
    Guid ProfessionalId,
    string Name,
    string? PhotoUrl,
    int ServicesCount,
    decimal TotalRevenue,
    decimal TotalCommission,
    decimal NetEarnings,
    List<CommissionServiceLineDto> ServiceLines);

public record CommissionServiceLineDto(
    string ServiceName,
    int Count,
    decimal UnitPrice,
    decimal Revenue,
    CommissionType CommissionType,
    decimal CommissionValue,
    decimal CommissionAmount,
    decimal NetAmount);

/// <summary>
/// Relatório de comissões por profissional em um intervalo de datas personalizado.
/// A comissão é calculada com base no serviço prestado em cada agendamento Concluído.
/// </summary>
public record GetProfessionalCommissionsReportQuery(
    Guid EstablishmentId,
    DateOnly DateFrom,
    DateOnly DateTo) : IRequest<List<ProfessionalCommissionDto>>;

public class GetProfessionalCommissionsReportQueryHandler
    : IRequestHandler<GetProfessionalCommissionsReportQuery, List<ProfessionalCommissionDto>>
{
    private readonly IAppDbContext _db;
    private readonly ITenantService _tenantService;

    public GetProfessionalCommissionsReportQueryHandler(IAppDbContext db, ITenantService tenantService)
        => (_db, _tenantService) = (db, tenantService);

    public async Task<List<ProfessionalCommissionDto>> Handle(
        GetProfessionalCommissionsReportQuery request, CancellationToken ct)
    {
        var tenantId = _tenantService.TenantId;

        var fromUtc = DateTime.SpecifyKind(request.DateFrom.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var toUtc   = DateTime.SpecifyKind(request.DateTo.ToDateTime(TimeOnly.MaxValue),   DateTimeKind.Utc);

        // Busca todos os agendamentos concluídos no período com profissional e serviço
        var bookings = await _db.Bookings
            .IgnoreQueryFilters()
            .Include(b => b.Professional)
            .Include(b => b.Service)
            .Where(b =>
                b.TenantId == tenantId &&
                !b.IsDeleted &&
                b.EstablishmentId == request.EstablishmentId &&
                b.Status == BookingStatus.Concluido &&
                b.Professional != null && !b.Professional.IsDeleted &&
                b.Service != null &&
                b.ScheduledAt >= fromUtc &&
                b.ScheduledAt <= toUtc)
            .ToListAsync(ct);

        // Todos os profissionais ativos do estabelecimento (inclusive os sem atendimento)
        var allProfessionals = await _db.Professionals
            .Where(p => p.EstablishmentId == request.EstablishmentId && !p.IsDeleted)
            .OrderBy(p => p.Order)
            .ThenBy(p => p.Name)
            .ToListAsync(ct);

        var byProfessional = bookings.GroupBy(b => b.ProfessionalId)
            .ToDictionary(g => g.Key, g => g.ToList());

        return allProfessionals.Select(prof =>
        {
            var profBookings = byProfessional.TryGetValue(prof.Id, out var list) ? list : [];

            // Agrupa por serviço para mostrar detalhamento
            var serviceLines = profBookings
                .GroupBy(b => new { b.ServiceId, b.Service!.Name, b.Service.Price, b.Service.CommissionType, b.Service.CommissionValue })
                .Select(g =>
                {
                    var count      = g.Count();
                    var revenue    = g.Key.Price * count;
                    var commAmt    = CalculateCommission(g.Key.CommissionType, g.Key.CommissionValue, g.Key.Price) * count;
                    return new CommissionServiceLineDto(
                        g.Key.Name,
                        count,
                        g.Key.Price,
                        revenue,
                        g.Key.CommissionType,
                        g.Key.CommissionValue,
                        commAmt,
                        revenue - commAmt);
                })
                .OrderByDescending(l => l.Revenue)
                .ToList();

            var totalRevenue    = serviceLines.Sum(l => l.Revenue);
            var totalCommission = serviceLines.Sum(l => l.CommissionAmount);

            return new ProfessionalCommissionDto(
                prof.Id,
                prof.Name,
                prof.PhotoUrl,
                profBookings.Count,
                totalRevenue,
                totalCommission,
                totalRevenue - totalCommission,
                serviceLines);
        }).ToList();
    }

    private static decimal CalculateCommission(CommissionType type, decimal value, decimal servicePrice)
        => type switch
        {
            CommissionType.Percentage => Math.Round(servicePrice * value / 100, 2),
            CommissionType.Fixed      => Math.Min(value, servicePrice), // não pode exceder o preço
            _                         => 0m,
        };
}
