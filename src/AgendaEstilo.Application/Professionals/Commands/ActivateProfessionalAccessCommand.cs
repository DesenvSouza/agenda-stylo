using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Entities;
using AgendaEstilo.Domain.Enums;
using AgendaEstilo.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Professionals.Commands;

/// <summary>
/// Cria (ou recria) a conta de acesso para um profissional.
/// Retorna as credenciais geradas para o proprietário poder compartilhar via WhatsApp.
/// </summary>
public record ActivateProfessionalAccessCommand(Guid ProfessionalId) : IRequest<ActivateProfessionalAccessResult>;
public record ActivateProfessionalAccessResult(string Login, string Password, string WhatsApp);

public class ActivateProfessionalAccessCommandHandler
    : IRequestHandler<ActivateProfessionalAccessCommand, ActivateProfessionalAccessResult>
{
    private readonly IAppDbContext _db;
    private readonly ITenantService _tenantService;

    public ActivateProfessionalAccessCommandHandler(IAppDbContext db, ITenantService tenantService)
    {
        _db = db;
        _tenantService = tenantService;
    }

    public async Task<ActivateProfessionalAccessResult> Handle(
        ActivateProfessionalAccessCommand request, CancellationToken ct)
    {
        var professional = await _db.Professionals
            .FirstOrDefaultAsync(p => p.Id == request.ProfessionalId, ct)
            ?? throw new KeyNotFoundException("Profissional não encontrado.");

        if (string.IsNullOrWhiteSpace(professional.WhatsApp))
            throw new InvalidOperationException("O profissional precisa ter WhatsApp cadastrado para receber acesso.");

        // Verifica se já existe conta (restaura se soft-deleted)
        var existing = await _db.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.ProfessionalId == professional.Id, ct);

        var password = GeneratePassword();
        var hash = BCrypt.Net.BCrypt.HashPassword(password);
        // Login = WhatsApp (apenas dígitos)
        var login = professional.WhatsApp;

        if (existing is not null)
        {
            existing.IsDeleted = false;
            existing.PasswordHash = hash;
            existing.Email = login;
            existing.RefreshToken = null;
            existing.RefreshTokenExpiry = null;
        }
        else
        {
            var user = new User
            {
                TenantId = _tenantService.TenantId,
                EstablishmentId = professional.EstablishmentId,
                ProfessionalId = professional.Id,
                Email = login,
                PasswordHash = hash,
                Role = UserRole.Profissional,
            };
            _db.Users.Add(user);
        }

        await _db.SaveChangesAsync(ct);

        return new ActivateProfessionalAccessResult(login, password, professional.WhatsApp);
    }

    /// <summary>Gera senha de 8 chars alfanumérica legível.</summary>
    private static string GeneratePassword()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var rng = new Random();
        return new string(Enumerable.Range(0, 8).Select(_ => chars[rng.Next(chars.Length)]).ToArray());
    }
}
