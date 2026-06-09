using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AgendaEstilo.Application.Professionals.Commands;

public record UploadProfessionalPhotoCommand(
    Guid ProfessionalId,
    Stream PhotoStream,
    string FileName,
    string ContentType) : IRequest<string>;

public class UploadProfessionalPhotoCommandHandler
    : IRequestHandler<UploadProfessionalPhotoCommand, string>
{
    private readonly IAppDbContext _db;
    private readonly IStorageService _storage;

    public UploadProfessionalPhotoCommandHandler(IAppDbContext db, IStorageService storage)
    {
        _db = db;
        _storage = storage;
    }

    public async Task<string> Handle(
        UploadProfessionalPhotoCommand request, CancellationToken cancellationToken)
    {
        var professional = await _db.Professionals
            .FirstOrDefaultAsync(p => p.Id == request.ProfessionalId, cancellationToken)
            ?? throw new KeyNotFoundException("Profissional não encontrado.");

        var ext = Path.GetExtension(request.FileName).ToLowerInvariant();
        var key = $"professionals/{request.ProfessionalId:N}/{Guid.NewGuid():N}{ext}";

        var url = await _storage.UploadAsync(
            request.PhotoStream, key, request.ContentType, cancellationToken);

        professional.PhotoUrl = url;
        await _db.SaveChangesAsync(cancellationToken);

        return url;
    }
}
