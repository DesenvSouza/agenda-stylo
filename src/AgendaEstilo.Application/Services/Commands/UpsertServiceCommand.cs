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
    decimal CommissionValue = 0) : IRequest<Guid>;

public class UpsertServiceCommandValidator : AbstractValidator<UpsertServiceCommand>
{
    public UpsertServiceCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.DurationMinutes).GreaterThan(0);
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0);
    }
}

public class UpsertServiceCommandHandler : IRequestHandler<UpsertServiceCommand, Guid>
{
    private readonly IAppDbContext _db;
    private readonly ITenantService _tenantService;

    public UpsertServiceCommandHandler(IAppDbContext db, ITenantService tenantService)
    {
        _db = db;
        _tenantService = tenantService;
    }

    public async Task<Guid> Handle(UpsertServiceCommand request, CancellationToken cancellationToken)
    {
        Domain.Entities.Service service;

        if (request.Id.HasValue)
        {
            // Edição — sem verificação de limite
            service = await _db.Services
                .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken)
                ?? throw new KeyNotFoundException("Serviço não encontrado.");
        }
        else
        {
            // Criação — verificar limite do plano
            var establishment = await _db.Establishments
                .IgnoreQueryFilters()
                .Where(e => e.Id == request.EstablishmentId && !e.IsDeleted)
                .Select(e => new { e.CurrentPlan })
                .FirstOrDefaultAsync(cancellationToken)
                ?? throw new KeyNotFoundException("Estabelecimento não encontrado.");

            var limite = PlanConstants.GetLimiteServicos(establishment.CurrentPlan);

            if (limite != PlanConstants.LimiteIlimitado)
            {
                var count = await _db.Services
                    .CountAsync(s => s.EstablishmentId == request.EstablishmentId, cancellationToken);

                if (count >= limite)
                {
                    var planLabel = establishment.CurrentPlan == PlanConstants.Profissional
                        ? "Profissional" : "Básico";
                    throw new InvalidOperationException(
                        $"Limite de {limite} serviço(s) atingido para o plano {planLabel}. " +
                        $"Faça upgrade para o plano Profissional para adicionar mais.");
                }
            }

            service = new Domain.Entities.Service
            {
                TenantId = _tenantService.TenantId,
                EstablishmentId = request.EstablishmentId,
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
        return service.Id;
    }
}
