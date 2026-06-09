namespace AgendaEstilo.Domain.Constants;

/// <summary>
/// Planos disponíveis na plataforma AgendaEstilo.
/// </summary>
public static class PlanConstants
{
    // ── Nomes canônicos ──────────────────────────────────────────────────────
    public const string Basico       = "Basico";
    public const string Profissional = "Profissional";

    // ── Preços em BRL ────────────────────────────────────────────────────────
    public const decimal PrecoBasico       = 29.90m;
    public const decimal PrecoProfissional = 49.90m;

    // ── Limites ──────────────────────────────────────────────────────────────
    public const int LimiteProfissionaisBasico  = 2;
    public const int LimiteServicosBasico       = 5;
    public const int LimiteIlimitado            = int.MaxValue;   // Profissional não tem limite

    // ── Helpers ──────────────────────────────────────────────────────────────
    public static int GetLimiteProfissionais(string? plan) =>
        plan == Profissional ? LimiteIlimitado : LimiteProfissionaisBasico;

    public static int GetLimiteServicos(string? plan) =>
        plan == Profissional ? LimiteIlimitado : LimiteServicosBasico;

    public static decimal GetPreco(string plan) => plan switch
    {
        Profissional => PrecoProfissional,
        _            => PrecoBasico,
    };

    public static bool IsValid(string? plan) =>
        plan == Basico || plan == Profissional;
}
