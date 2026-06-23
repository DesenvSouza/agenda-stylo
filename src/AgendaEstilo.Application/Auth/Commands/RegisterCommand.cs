using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Entities;
using AgendaEstilo.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Auth.Commands;

public record RegisterCommand(
    string EstablishmentName,
    string Slug,
    EstablishmentCategory Category,
    string Phone,
    string Email,
    string Password,
    string? ReferralCode = null) : IRequest<Guid>;

public class RegisterCommandValidator : AbstractValidator<RegisterCommand>
{
    public RegisterCommandValidator()
    {
        RuleFor(x => x.EstablishmentName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Slug).NotEmpty().MaximumLength(100).Matches("^[a-z0-9-]+$");
        RuleFor(x => x.Phone).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8);
    }
}

public class RegisterCommandHandler : IRequestHandler<RegisterCommand, Guid>
{
    private readonly IAppDbContext _db;

    public RegisterCommandHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<Guid> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var slugExists = await _db.Establishments
            .IgnoreQueryFilters()
            .AnyAsync(e => e.Slug == request.Slug, cancellationToken);

        if (slugExists)
            throw new InvalidOperationException("Slug já está em uso.");

        var tenantId = Guid.NewGuid();
        var establishmentId = Guid.NewGuid();

        // Valida código de referência (se informado)
        string? validatedReferralCode = null;
        if (!string.IsNullOrWhiteSpace(request.ReferralCode))
        {
            var code = request.ReferralCode.Trim().ToUpperInvariant();
            var promoterExists = await _db.SystemUsers
                .AnyAsync(u => u.Role == 1 && u.IsActive && u.PromoterCode == code, cancellationToken);
            if (promoterExists)
                validatedReferralCode = code;
        }

        var establishment = new Establishment
        {
            Id = establishmentId,
            TenantId = tenantId,
            Name = request.EstablishmentName,
            Slug = request.Slug,
            Category = request.Category,
            Phone = request.Phone,
            ReferralCode = validatedReferralCode,
            ContactEmail = request.Email
        };

        var user = new User
        {
            TenantId = tenantId,
            EstablishmentId = establishmentId,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = UserRole.Proprietario
        };

        _db.Establishments.Add(establishment);
        _db.Users.Add(user);
        await _db.SaveChangesAsync(cancellationToken);

        return user.Id;
    }
}
