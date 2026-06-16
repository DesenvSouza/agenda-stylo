using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Entities;
using AgendaEstilo.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Announcements.Commands;

/// <summary>
/// Cria ou atualiza um comunicado.
/// Id == null → criação. Id != null → atualização.
/// </summary>
public record UpsertAnnouncementCommand(
    Guid?    Id,
    string   Title,
    string   Body,
    string   Severity,
    string   Target,
    DateTime StartsAt,
    DateTime EndsAt,
    string?  ActionLabel,
    string?  ActionUrl,
    bool     IsDismissible,
    bool     IsActive
) : IRequest<AnnouncementDto>;

public record AnnouncementDto(
    Guid     Id,
    string   Title,
    string   Body,
    string   Severity,
    string   Target,
    DateTime StartsAt,
    DateTime EndsAt,
    string?  ActionLabel,
    string?  ActionUrl,
    bool     IsDismissible,
    bool     IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public class UpsertAnnouncementCommandHandler : IRequestHandler<UpsertAnnouncementCommand, AnnouncementDto>
{
    private readonly IAppDbContext _db;
    public UpsertAnnouncementCommandHandler(IAppDbContext db) => _db = db;

    public async Task<AnnouncementDto> Handle(UpsertAnnouncementCommand request, CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<AnnouncementSeverity>(request.Severity, ignoreCase: true, out var severity))
            throw new ArgumentException($"Severidade inválida: '{request.Severity}'. Use: Novidade, Info, Aviso, Urgente.");

        if (!Enum.TryParse<AnnouncementTarget>(request.Target, ignoreCase: true, out var target))
            throw new ArgumentException($"Público inválido: '{request.Target}'. Use: Todos, Basico, Profissional.");

        if (request.EndsAt <= request.StartsAt)
            throw new ArgumentException("A data de encerramento deve ser posterior à data de início.");

        var now = DateTime.UtcNow;
        Announcement entity;

        if (request.Id.HasValue)
        {
            // ── Atualização ───────────────────────────────────────────────────
            entity = await _db.Announcements
                .FirstOrDefaultAsync(a => a.Id == request.Id.Value, cancellationToken)
                ?? throw new KeyNotFoundException("Comunicado não encontrado.");
        }
        else
        {
            // ── Criação ───────────────────────────────────────────────────────
            entity = new Announcement { Id = Guid.NewGuid(), CreatedAt = now };
            _db.Announcements.Add(entity);
        }

        entity.Title         = request.Title.Trim();
        entity.Body          = request.Body.Trim();
        entity.Severity      = severity;
        entity.Target        = target;
        entity.StartsAt      = request.StartsAt;
        entity.EndsAt        = request.EndsAt;
        entity.ActionLabel   = string.IsNullOrWhiteSpace(request.ActionLabel)  ? null : request.ActionLabel.Trim();
        entity.ActionUrl     = string.IsNullOrWhiteSpace(request.ActionUrl)    ? null : request.ActionUrl.Trim();
        entity.IsDismissible = request.IsDismissible;
        entity.IsActive      = request.IsActive;
        entity.UpdatedAt     = now;

        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(entity);
    }

    public static AnnouncementDto ToDto(Announcement a) => new(
        a.Id, a.Title, a.Body,
        a.Severity.ToString(), a.Target.ToString(),
        a.StartsAt, a.EndsAt,
        a.ActionLabel, a.ActionUrl,
        a.IsDismissible, a.IsActive,
        a.CreatedAt, a.UpdatedAt);
}
