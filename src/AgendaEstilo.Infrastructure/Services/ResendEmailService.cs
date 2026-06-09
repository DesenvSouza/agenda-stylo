using AgendaEstilo.Application.Common;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Json;

namespace AgendaEstilo.Infrastructure.Services;

public class ResendEmailService : IEmailService
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<ResendEmailService> _logger;

    public ResendEmailService(
        IHttpClientFactory httpFactory,
        IConfiguration config,
        ILogger<ResendEmailService> logger)
    {
        _httpFactory = httpFactory;
        _config = config;
        _logger = logger;
    }

    public async Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default)
    {
        var apiKey = _config["Resend:ApiKey"];
        var from = _config["Resend:From"] ?? "noreply@agendaestilo.com.br";

        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogWarning("Resend:ApiKey not configured — skipping email to {To}.", to);
            return;
        }

        try
        {
            var client = _httpFactory.CreateClient();
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

            var payload = new { from, to = new[] { to }, subject, html = htmlBody };
            var response = await client.PostAsJsonAsync("https://api.resend.com/emails", payload, ct);

            if (!response.IsSuccessStatusCode)
                _logger.LogWarning("Resend returned {Status} for {To}", response.StatusCode, to);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email via Resend to {To}", to);
        }
    }
}
