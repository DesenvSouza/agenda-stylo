using AgendaEstilo.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace AgendaEstilo.Infrastructure.Services;

/// <summary>
/// Implementação de armazenamento local em disco (wwwroot/uploads/).
/// Usada automaticamente quando o Cloudflare R2 não está configurado.
/// </summary>
public class LocalStorageService : IStorageService
{
    private readonly string _uploadsDir;
    private readonly string _apiBaseUrl;

    public LocalStorageService(IHostEnvironment env, IConfiguration config)
    {
        var wwwroot = Path.Combine(env.ContentRootPath, "wwwroot");
        _uploadsDir = Path.Combine(wwwroot, "uploads");
        Directory.CreateDirectory(_uploadsDir);
        _apiBaseUrl = (config["ApiUrl"] ?? "http://localhost:5000").TrimEnd('/');
    }

    public async Task<string> UploadAsync(
        Stream stream, string fileName, string contentType,
        CancellationToken cancellationToken = default)
    {
        var folder = Guid.NewGuid().ToString("N");
        var dir = Path.Combine(_uploadsDir, folder);
        Directory.CreateDirectory(dir);

        // Segurança: evita path traversal
        var safeName = Path.GetFileName(fileName);
        var filePath = Path.Combine(dir, safeName);

        await using var fs = File.Create(filePath);
        await stream.CopyToAsync(fs, cancellationToken);

        return $"{_apiBaseUrl}/uploads/{folder}/{safeName}";
    }

    public Task DeleteAsync(string fileUrl, CancellationToken cancellationToken = default)
    {
        try
        {
            if (Uri.TryCreate(fileUrl, UriKind.Absolute, out var uri))
            {
                // AbsolutePath ex: /uploads/<folder>/<filename>
                var segments = uri.AbsolutePath.Trim('/').Split('/');
                if (segments.Length == 3 && segments[0] == "uploads")
                {
                    var fullPath = Path.Combine(_uploadsDir, segments[1], segments[2]);
                    if (File.Exists(fullPath))
                        File.Delete(fullPath);
                }
            }
        }
        catch { /* ignora falhas silenciosamente */ }

        return Task.CompletedTask;
    }
}
