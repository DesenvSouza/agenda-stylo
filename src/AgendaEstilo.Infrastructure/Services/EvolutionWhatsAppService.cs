using AgendaEstilo.Application.Common;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Json;
using System.Text.RegularExpressions;

namespace AgendaEstilo.Infrastructure.Services;

public class EvolutionWhatsAppService : IWhatsAppService
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<EvolutionWhatsAppService> _logger;

    public EvolutionWhatsAppService(
        IHttpClientFactory httpFactory,
        IConfiguration config,
        ILogger<EvolutionWhatsAppService> logger)
    {
        _httpFactory = httpFactory;
        _config = config;
        _logger = logger;
    }

    public async Task<bool> SendMessageAsync(string phone, string message, CancellationToken ct = default)
    {
        var baseUrl = _config["EvolutionApi:BaseUrl"];
        var apiKey = _config["EvolutionApi:ApiKey"];
        var instance = _config["EvolutionApi:InstanceName"] ?? _config["EvolutionApi:Instance"];
        var maxRetries = int.TryParse(_config["EvolutionApi:MaxRetries"], out var r) ? r : 2;

        if (string.IsNullOrEmpty(baseUrl))
        {
            _logger.LogWarning("EvolutionApi:BaseUrl not configured — skipping WhatsApp.");
            return false;
        }

        var formattedPhone = FormatPhone(phone);
        var payload = new { number = formattedPhone, text = message };

        for (var attempt = 1; attempt <= maxRetries; attempt++)
        {
            try
            {
                var client = _httpFactory.CreateClient();
                client.DefaultRequestHeaders.Add("apikey", apiKey);

                var response = await client.PostAsJsonAsync(
                    $"{baseUrl}/message/sendText/{instance}", payload, ct);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("WhatsApp sent to {Phone} (attempt {Attempt})", phone, attempt);
                    return true;
                }

                _logger.LogWarning("WhatsApp attempt {Attempt} failed: {Status}", attempt, response.StatusCode);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "WhatsApp attempt {Attempt} threw exception", attempt);
            }

            if (attempt < maxRetries)
                await Task.Delay(TimeSpan.FromSeconds(5), ct);
        }

        _logger.LogError("WhatsApp failed after {MaxRetries} attempts for {Phone}", maxRetries, phone);
        return false;
    }

    private static string FormatPhone(string phone)
    {
        var digits = Regex.Replace(phone, @"\D", "");
        if (!digits.StartsWith("55")) digits = "55" + digits;
        return digits + "@s.whatsapp.net";
    }
}
