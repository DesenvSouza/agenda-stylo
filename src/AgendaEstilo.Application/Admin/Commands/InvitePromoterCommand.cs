using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Admin.Commands;

public record InvitePromoterCommand(
    string Name,
    string Email,
    decimal CommissionPercent,
    Guid AdminId) : IRequest<InvitePromoterResult>;

public record InvitePromoterResult(
    string TempPassword,
    string PromoterCode,
    string Email);

public class InvitePromoterCommandHandler : IRequestHandler<InvitePromoterCommand, InvitePromoterResult>
{
    private readonly IAppDbContext _db;

    public InvitePromoterCommandHandler(IAppDbContext db) => _db = db;

    public async Task<InvitePromoterResult> Handle(InvitePromoterCommand request, CancellationToken ct)
    {
        var emailLower = request.Email.Trim().ToLowerInvariant();

        var exists = await _db.SystemUsers.AnyAsync(u => u.Email == emailLower, ct);
        if (exists)
            throw new InvalidOperationException("Já existe um usuário com este e-mail.");

        // Gera código único de 8 chars alfanumérico
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        string code;
        do
        {
            code = new string(Enumerable.Range(0, 8)
                .Select(_ => chars[Random.Shared.Next(chars.Length)]).ToArray());
        }
        while (await _db.SystemUsers.AnyAsync(u => u.PromoterCode == code, ct));

        // Gera senha temporária (12 chars hex)
        var tempPassword = Guid.NewGuid().ToString("N")[..12];

        var promoter = new SystemUser
        {
            Name                = request.Name.Trim(),
            Email               = emailLower,
            PasswordHash        = BCrypt.Net.BCrypt.HashPassword(tempPassword),
            Role                = 1, // Promoter
            PromoterCode        = code,
            CommissionPercent   = request.CommissionPercent,
            MustChangePassword  = true,
            InvitedByAdminId    = request.AdminId,
        };

        _db.SystemUsers.Add(promoter);
        await _db.SaveChangesAsync(ct);

        return new InvitePromoterResult(tempPassword, code, emailLower);
    }
}
