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
    int Order = 0) : IRequest<UpsertProfessionalResult>;

/// <summary>
/// Resultado do upsert.
/// Se <see cref="IsActive"/> for false e <see cref="PlanWarning"/> não for null,
/// o profissional foi criado como inativo porque o limite do plano foi atingido.
/// </summary>
public record UpsertProfessionalResult(Guid Id, bool IsActive, string? PlanWarning);

public class UpsertProfessionalCommandValidator : AbstractValidator<UpsertProfessionalCommand>
{
    public UpsertProfessionalCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Specialty).MaximumLength(100);
    }
}

public class UpsertProfessionalCommandHandler : IRequestHandler<UpsertProfessionalCommand, UpsertProfessionalResult>
{
    private readonly IAppDbContext _db;
    private readonly ITenantService _tenantService;

    public UpsertProfessionalCommandHandler(IAppDbContext db, ITenantService tenantService)
    {
        _db = db;
        _tenantService = tenantService;
    }

    public async Task<UpsertProfessionalResult> Handle(UpsertProfessionalCommand request, CancellationToken cancellationToken)
    {
        Professional professional;
        string? planWarning = null;

        if (request.Id.HasValue)
        {
            // ── Edição ─────────────────────────────────────────────────────────
            // Não altera IsActive nem verifica limite — apenas atualiza dados
            professional = await _db.Professionals
                .FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken)
                ?? throw new KeyNotFoundException("Profissional não encontrado.");
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

            var limite = PlanConstants.GetLimiteProfissionais(establishment.CurrentPlan);

            // Conta apenas profissionais ATIVOS (o limite é de ativos, não de total)
            bool criarInativo = false;
            if (limite != PlanConstants.LimiteIlimitado)
            {
                var activeCount = await _db.Professionals
                    .CountAsync(p => p.EstablishmentId == request.EstablishmentId && p.IsActive, cancellationToken);

                if (activeCount >= limite)
                {
                    criarInativo = true;
                    var planLabel = establishment.CurrentPlan == PlanConstants.Profissional
                        ? "Profissional" : "Básico";
                    planWarning =
                        $"Profissional criado como inativo — limite de {limite} profissional(is) ativo(s) atingido " +
                        $"no plano {planLabel}. Desative outro profissional ou faça upgrade do plano.";
                }
            }

            professional = new Professional
            {
                TenantId        = _tenantService.TenantId,
                EstablishmentId = request.EstablishmentId,
                IsActive        = !criarInativo,   // inativo se no limite
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
        return new UpsertProfessionalResult(professional.Id, professional.IsActive, planWarning);
    }
}
