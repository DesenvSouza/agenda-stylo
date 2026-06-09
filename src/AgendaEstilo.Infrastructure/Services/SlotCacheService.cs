using System.Collections.Concurrent;
using AgendaEstilo.Application.Common;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Primitives;

namespace AgendaEstilo.Infrastructure.Services;

public class SlotCacheService : ISlotCacheService
{
    private readonly IMemoryCache _cache;
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _tokens = new();

    public SlotCacheService(IMemoryCache cache) => _cache = cache;

    public T? Get<T>(string key) where T : class =>
        _cache.TryGetValue(key, out T? value) ? value : null;

    public void Set<T>(string key, string scope, T value, TimeSpan ttl) where T : class
    {
        var cts = _tokens.GetOrAdd(scope, _ => new CancellationTokenSource());
        var options = new MemoryCacheEntryOptions()
            .SetAbsoluteExpiration(ttl)
            .AddExpirationToken(new CancellationChangeToken(cts.Token));
        _cache.Set(key, value, options);
    }

    public void InvalidateScope(string scope)
    {
        if (_tokens.TryRemove(scope, out var cts))
        {
            cts.Cancel();
            cts.Dispose();
        }
    }
}
