using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Constants;
using AgendaEstilo.Domain.Enums;
using AgendaEstilo.Domain.Interfaces;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Services.Commands;

public record UpsertServiceCommand(
    Guid? Id,
    Guid EstablishmentId,
    string Name,
    string? Category,
    int DurationMinutes,
    decimal Price,
    string? Description,
    int Order = 0,
    CommissionType CommissionType = CommissionType.None,
    decimal CommissionValue = 0) : IRequest<UpsertServiceResult>;

/// <summary>
/// Resultado do upsert.
/// Se <see cref="IsActive"/> for false e <see cref="PlanWarning"/> não for null,
/// o serviço foi criado como inativo porque o limite do plano foi atingido.
/// </summary>
public record UpsertServiceResult(Guid Id, bool IsActive, string? PlanWarning);

public class UpsertServiceCommandValidator : AbstractValidator<UpsertServiceCommand>
{
    public UpsertServiceCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.DurationMinutes).GreaterThan(0);
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0);
    }
}

public class UpsertServiceCommandHandler : IRequestHandler<UpsertServiceCommand, UpsertServiceResult>
{
    private readonly IAppDbContext _db;
    private readonly ITenantService _tenantService;

    public UpsertServiceCommandHandler(IAppDbContext db, ITenantService tenantService)
    {
        _db = db;
        _tenantService = tenantService;
    }

    public async Task<UpsertServiceResult> Handle(UpsertServiceCommand request, CancellationToken cancellationToken)
    {
        Domain.Entities.Service service;
        string? planWarning = null;

        if (request.Id.HasValue)
        {
            // ── Edição ─────────────────────────────────────────────────────────
            // Não altera IsActive nem verifica limite
            service = await _db.Services
                .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken)
                ?? throw new KeyNotFoundException("Serviço não encontrado.");
        }
        else
        {
            // ── Criação ────────────────────────────────────────────────────────
            var establishment = await _db.Establishments
                .IgnoreQueryFilters()
                .Where(e => e.Id == request.EstablishmentId && !e.IsDeleted)
                .Select(e => new { e.CurrentPlan })
                .FirstOrDefaultAsync(cancellationToken)
                ?? throw new KeyNotFoundException("Estabelecimento não encontrado.");

            var limite = PlanConstants.GetLimiteServicos(establishment.CurrentPlan);

            // Conta apenas serviços ATIVOS (o limite é de ativos, não de total)
            bool criarInativo = false;
            if (limite != PlanConstants.LimiteIlimitado)
            {
                var activeCount = await _db.Services
                    .CountAsync(s => s.EstablishmentId == request.EstablishmentId && s.IsActive, cancellationToken);

                if (activeCount >= limite)
                {
                    criarInativo = true;
                    var planLabel = establishment.CurrentPlan == PlanConstants.Profissional
                        ? "Profissional" : "Básico";
                    planWarning =
                        $"Serviço criado como inativo — limite de {limite} serviço(s) ativo(s) atingido " +
                        $"no plano {planLabel}. Desative outro serviço ou faça upgrade do plano.";
                }
            }

            service = new Domain.Entities.Service
            {
                TenantId        = _tenantService.TenantId,
                EstablishmentId = request.EstablishmentId,
                IsActive        = !criarInativo,   // inativo se no limite
            };
            _db.Services.Add(service);
        }

        service.Name            = request.Name;
        service.Category        = request.Category;
        service.DurationMinutes = request.DurationMinutes;
        service.Price           = request.Price;
        service.Description     = request.Description;
        service.Order           = request.Order;
        service.CommissionType  = request.CommissionType;
        service.CommissionValue = Math.Max(0, request.CommissionValue);

        await _db.SaveChangesAsync(cancellationToken);
        return new UpsertServiceResult(service.Id, service.IsActive, planWarning);
    }
}
