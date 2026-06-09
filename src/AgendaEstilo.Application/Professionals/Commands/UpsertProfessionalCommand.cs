using AgendaEstilo.Application.Common;
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
            professional = await _db.Professionals
                .FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken)
                ?? throw new KeyNotFoundException("Profissional não encontrado.");
        }
        else
        {
            professional = new Professional
            {
                TenantId = _tenantService.TenantId,
                EstablishmentId = request.EstablishmentId,
            };
            _db.Professionals.Add(professional);
        }
        professional.Name = request.Name;
        professional.Specialty = request.Specialty;
        professional.Bio = request.Bio;
        professional.Order = request.Order;
        // Apenas dígitos para CPF e WhatsApp
        if (request.Cpf     is not null) professional.Cpf     = new string(request.Cpf.Where(char.IsDigit).ToArray());
        if (request.WhatsApp is not null) professional.WhatsApp = new string(request.WhatsApp.Where(char.IsDigit).ToArray());

        await _db.SaveChangesAsync(cancellationToken);
        return professional.Id;
    }
}
