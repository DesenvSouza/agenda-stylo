namespace AgendaEstilo.Application.Common;

public interface ISlotCacheService
{
    T? Get<T>(string key) where T : class;
    void Set<T>(string key, string invalidationScope, T value, TimeSpan ttl) where T : class;
    void InvalidateScope(string scope);
}
