using AgendaEstilo.Application.Bookings.Commands;
using AgendaEstilo.Application.Common;
using AgendaEstilo.Domain.Entities;
using AgendaEstilo.Domain.Enums;
using AgendaEstilo.Domain.Exceptions;
using AgendaEstilo.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace AgendaEstilo.Tests;

public class BookingCreationTests
{
    private static readonly Guid TenantId = Guid.NewGuid();
    private static readonly Guid EstablishmentId = Guid.NewGuid();

    // Far-future date to pass the ScheduledAt > UtcNow validator
    private static readonly DateTime FutureSlot =
        DateTime.SpecifyKind(new DateTime(2027, 6, 15, 10, 0, 0), DateTimeKind.Utc);

    private static (TestAppDbContext ctx, CreateBookingCommandHandler handler) BuildHandler(
        TestAppDbContext? ctx = null)
    {
        ctx ??= TestAppDbContext.Create();
        var tenantSvc = new Mock<ITenantService>();
        tenantSvc.Setup(t => t.TenantId).Returns(TenantId);
        var slotCache = new Mock<ISlotCacheService>();
        var handler = new CreateBookingCommandHandler(ctx, tenantSvc.Object, slotCache.Object);
        return (ctx, handler);
    }

    private static Service SeedService(TestAppDbContext ctx, int duration = 60)
    {
        var s = new Service
        {
            Id = Guid.NewGuid(),
            TenantId = TenantId,
            EstablishmentId = EstablishmentId,
            Name = "Corte",
            DurationMinutes = duration,
            Price = 80m,
            IsActive = true
        };
        ctx.Services.Add(s);
        return s;
    }

    private static Professional SeedProfessional(TestAppDbContext ctx)
    {
        var p = new Professional
        {
            Id = Guid.NewGuid(),
            TenantId = TenantId,
            EstablishmentId = EstablishmentId,
            Name = "João",
            IsActive = true
        };
        ctx.Professionals.Add(p);
        return p;
    }

    [Fact]
    public async Task DeveCriarBooking_ComSucesso()
    {
        var (ctx, handler) = BuildHandler();
        var service = SeedService(ctx);
        var prof = SeedProfessional(ctx);
        await ctx.SaveChangesAsync();

        var cmd = new CreateBookingCommand(
            EstablishmentId, prof.Id, service.Id,
            "Maria Silva", "31999990001", null,
            FutureSlot, BookingSource.Online);

        var result = await handler.Handle(cmd, default);

        Assert.NotEqual(Guid.Empty, result.BookingId);
        Assert.False(string.IsNullOrEmpty(result.CancelToken));

        var booking = await ctx.Bookings.FirstAsync(b => b.Id == result.BookingId);
        Assert.Equal(BookingStatus.Confirmado, booking.Status);
        Assert.Equal(FutureSlot, booking.ScheduledAt);
        Assert.Equal(FutureSlot.AddMinutes(60), booking.EndsAt);
    }

    [Fact]
    public async Task DeveRetornar409_QuandoSlotOcupado()
    {
        var (ctx, handler) = BuildHandler();
        var service = SeedService(ctx, 60);
        var prof = SeedProfessional(ctx);

        // Existing booking at the same slot
        ctx.Bookings.Add(new Booking
        {
            Id = Guid.NewGuid(),
            TenantId = TenantId,
            EstablishmentId = EstablishmentId,
            ProfessionalId = prof.Id,
            ServiceId = service.Id,
            ClientId = Guid.NewGuid(),
            ScheduledAt = FutureSlot,
            EndsAt = FutureSlot.AddMinutes(60),
            Status = BookingStatus.Confirmado,
            Source = BookingSource.Online,
            CancelToken = Guid.NewGuid().ToString()
        });
        await ctx.SaveChangesAsync();

        var cmd = new CreateBookingCommand(
            EstablishmentId, prof.Id, service.Id,
            "Pedro Costa", "31999990002", null,
            FutureSlot, BookingSource.Manual);

        await Assert.ThrowsAsync<BookingConflictException>(() =>
            handler.Handle(cmd, default));
    }

    [Fact]
    public async Task DeveEncontrarCliente_PeloTelefone()
    {
        var (ctx, handler) = BuildHandler();
        var service = SeedService(ctx);
        var prof = SeedProfessional(ctx);

        var existingClient = new Client
        {
            Id = Guid.NewGuid(),
            TenantId = TenantId,
            EstablishmentId = EstablishmentId,
            Name = "Ana Lima",
            Phone = "31999990003",
            VisitCount = 2
        };
        ctx.Clients.Add(existingClient);
        await ctx.SaveChangesAsync();

        var clientCountBefore = await ctx.Clients.CountAsync();

        var cmd = new CreateBookingCommand(
            EstablishmentId, prof.Id, service.Id,
            "Ana Lima", "31999990003", null,
            FutureSlot, BookingSource.Manual);

        await handler.Handle(cmd, default);

        // No new client should have been created
        var clientCountAfter = await ctx.Clients.CountAsync();
        Assert.Equal(clientCountBefore, clientCountAfter);

        var booking = await ctx.Bookings.FirstAsync();
        Assert.Equal(existingClient.Id, booking.ClientId);
    }

    [Fact]
    public async Task DeveCriarCliente_SeNaoExistir()
    {
        var (ctx, handler) = BuildHandler();
        var service = SeedService(ctx);
        var prof = SeedProfessional(ctx);
        await ctx.SaveChangesAsync();

        var clientCountBefore = await ctx.Clients.CountAsync();

        var cmd = new CreateBookingCommand(
            EstablishmentId, prof.Id, service.Id,
            "Carlos Novo", "31999990004", "carlos@email.com",
            FutureSlot, BookingSource.Presencial);

        await handler.Handle(cmd, default);

        var clientCountAfter = await ctx.Clients.CountAsync();
        Assert.Equal(clientCountBefore + 1, clientCountAfter);

        var newClient = await ctx.Clients.FirstAsync(c => c.Phone == "31999990004");
        Assert.Equal("Carlos Novo", newClient.Name);
        Assert.Equal("carlos@email.com", newClient.Email);
    }
}
