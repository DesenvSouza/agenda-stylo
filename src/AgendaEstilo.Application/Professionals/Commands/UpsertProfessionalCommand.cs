using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Constants;
using AgendaEstilo.Domain.Entities;
using AgendaEstilo.Domain.Interfaces;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Professionals.Commands;

public record UpsertProfessionalCommand(
    Guid? Id,
    Guid EstablishmentId,
    string Name,
    string? Specialty,
    string? Bio,
    string? Cpf,
    string? WhatsApp,
    int Order = 0) : IRequest<Guid>;

public class UpsertProfessionalCommandValidator : AbstractValidator<UpsertProfessionalCommand>
{
    public UpsertProfessionalCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Specialty).MaximumLength(100);
    }
}

public class UpsertProfessionalCommandHandler : IRequestHandler<UpsertProfessionalCommand, Guid>
{
    private readonly IAppDbContext _db;
    private readonly ITenantService _tenantService;

    public UpsertProfessionalCommandHandler(IAppDbContext db, ITenantService tenantService)
    {
        _db = db;
        _tenantService = tenantService;
    }

    public async Task<Guid> Handle(UpsertProfessionalCommand request, CancellationToken cancellationToken)
    {
        Professional professional;

        if (request.Id.HasValue)
        {
            // Edição — sem verificação de limite
            professional = await _db.Professionals
                .FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken)
                ?? throw new KeyNotFoundException("Profissional não encontrado.");
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

            var limite = PlanConstants.GetLimiteProfissionais(establishment.CurrentPlan);

            if (limite != PlanConstants.LimiteIlimitado)
            {
                var count = await _db.Professionals
                    .CountAsync(p => p.EstablishmentId == request.EstablishmentId, cancellationToken);

                if (count >= limite)
                {
                    var planLabel = establishment.CurrentPlan == PlanConstants.Profissional
                        ? "Profissional" : "Básico";
                    throw new InvalidOperationException(
                        $"Limite de {limite} profissional(is) atingido para o plano {planLabel}. " +
                        $"Faça upgrade para o plano Profissional para adicionar mais.");
                }
            }

            professional = new Professional
            {
                TenantId = _tenantService.TenantId,
                EstablishmentId = request.EstablishmentId,
            };
            _db.Professionals.Add(professional);
        }

        professional.Name      = request.Name;
        professional.Specialty = request.Specialty;
        professional.Bio       = request.Bio;
        professional.Order     = request.Order;

        if (request.Cpf      is not null) professional.Cpf      = new string(request.Cpf.Where(char.IsDigit).ToArray());
        if (request.WhatsApp is not null) professional.WhatsApp = new string(request.WhatsApp.Where(char.IsDigit).ToArray());

        await _db.SaveChangesAsync(cancellationToken);
        return professional.Id;
    }
}
