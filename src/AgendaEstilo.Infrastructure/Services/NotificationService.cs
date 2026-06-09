using AgendaEstilo.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace AgendaEstilo.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(IHttpClientFactory httpClientFactory, IConfiguration config, ILogger<NotificationService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _config = config;
        _logger = logger;
    }

    public async Task SendWhatsAppAsync(string phone, string message, CancellationToken cancellationToken = default)
    {
        try
        {
            var baseUrl = _config["EvolutionApi:BaseUrl"];
            var apiKey = _config["EvolutionApi:ApiKey"];
            var instance = _config["EvolutionApi:Instance"];

            if (string.IsNullOrEmpty(baseUrl)) return;

            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("apikey", apiKey);

            var payload = new { number = phone, text = message };
            await client.PostAsJsonAsync($"{baseUrl}/message/sendText/{instance}", payload, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send WhatsApp to {Phone}", phone);
        }
    }

    public async Task SendEmailAsync(string email, string subject, string body, CancellationToken cancellationToken = default)
    {
        try
        {
            var apiKey = _config["Resend:ApiKey"];
            var from = _config["Resend:From"] ?? "noreply@agendaestilo.com.br";

            if (string.IsNullOrEmpty(apiKey)) return;

            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

            var payload = new { from, to = new[] { email }, subject, html = body };
            await client.PostAsJsonAsync("https://api.resend.com/emails", payload, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}", email);
        }
    }
}
