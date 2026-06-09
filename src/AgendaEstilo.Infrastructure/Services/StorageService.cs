using AgendaEstilo.Domain.Interfaces;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Configuration;

namespace AgendaEstilo.Infrastructure.Services;

public class StorageService : IStorageService
{
    private readonly IAmazonS3 _s3Client;
    private readonly string _bucketName;
    private readonly string _publicUrl;

    public StorageService(IAmazonS3 s3Client, IConfiguration config)
    {
        _s3Client = s3Client;
        _bucketName = config["CloudflareR2:BucketName"] ?? throw new InvalidOperationException("CloudflareR2:BucketName not configured");
        _publicUrl = config["CloudflareR2:PublicUrl"] ?? string.Empty;
    }

    public async Task<string> UploadAsync(Stream stream, string fileName, string contentType, CancellationToken cancellationToken = default)
    {
        var key = $"{Guid.NewGuid():N}/{fileName}";
        var request = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = key,
            InputStream = stream,
            ContentType = contentType,
            DisablePayloadSigning = true
        };
        await _s3Client.PutObjectAsync(request, cancellationToken);
        return string.IsNullOrEmpty(_publicUrl) ? key : $"{_publicUrl}/{key}";
    }

    public async Task DeleteAsync(string fileName, CancellationToken cancellationToken = default)
    {
        await _s3Client.DeleteObjectAsync(_bucketName, fileName, cancellationToken);
    }
}
