using AgendaEstilo.Application.Common;
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
            service = await _db.Services
                .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken)
                ?? throw new KeyNotFoundException("Serviço não encontrado.");
        }
        else
        {
            service = new Domain.Entities.Service
            {
                TenantId = _tenantService.TenantId,
                EstablishmentId = request.EstablishmentId,
            };
            _db.Services.Add(service);
        }
        service.Name = request.Name;
        service.Category = request.Category;
        service.DurationMinutes = request.DurationMinutes;
        service.Price = request.Price;
        service.Description = request.Description;
        service.Order = request.Order;
        service.CommissionType = request.CommissionType;
        service.CommissionValue = Math.Max(0, request.CommissionValue);

        await _db.SaveChangesAsync(cancellationToken);
        return service.Id;
    }
}
