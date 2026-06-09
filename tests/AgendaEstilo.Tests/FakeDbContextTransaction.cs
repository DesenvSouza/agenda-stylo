using Microsoft.EntityFrameworkCore.Storage;

namespace AgendaEstilo.Tests;

/// <summary>
/// No-op transaction for in-memory database tests.
/// </summary>
internal sealed class FakeDbContextTransaction : IDbContextTransaction
{
    public Guid TransactionId { get; } = Guid.NewGuid();
    public bool SupportsSavepoints => false;

    public void Commit() { }
    public Task CommitAsync(CancellationToken ct = default) => Task.CompletedTask;
    public void Rollback() { }
    public Task RollbackAsync(CancellationToken ct = default) => Task.CompletedTask;
    public void CreateSavepoint(string name) { }
    public Task CreateSavepointAsync(string name, CancellationToken ct = default) => Task.CompletedTask;
    public void RollbackToSavepoint(string name) { }
    public Task RollbackToSavepointAsync(string name, CancellationToken ct = default) => Task.CompletedTask;
    public void ReleaseSavepoint(string name) { }
    public Task ReleaseSavepointAsync(string name, CancellationToken ct = default) => Task.CompletedTask;
    public void Dispose() { }
    public ValueTask DisposeAsync() => ValueTask.CompletedTask;
}
