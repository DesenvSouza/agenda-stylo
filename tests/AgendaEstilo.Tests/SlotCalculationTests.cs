using AgendaEstilo.Application.Bookings.Queries;
using AgendaEstilo.Domain.Entities;
using AgendaEstilo.Domain.Enums;
using Xunit;

namespace AgendaEstilo.Tests;

public class SlotCalculationTests
{
    // Future Monday to avoid the "current > DateTime.UtcNow" filter blocking all slots
    private static readonly DateOnly TestDate = new(2027, 1, 4); // Monday

    private static TestAppDbContext BuildContext() => TestAppDbContext.Create();

    private static Service MakeService(Guid id, int duration = 60) => new()
    {
        Id = id,
        TenantId = Guid.NewGuid(),
        EstablishmentId = Guid.NewGuid(),
        Name = "Corte",
        DurationMinutes = duration,
        Price = 50m,
        IsActive = true
    };

    private static Availability MakeAvailability(Guid profId, DayOfWeek day,
        TimeOnly start, TimeOnly end) => new()
    {
        Id = Guid.NewGuid(),
        TenantId = Guid.NewGuid(),
        ProfessionalId = profId,
        DayOfWeek = day,
        StartTime = start,
        EndTime = end,
        IsActive = true
    };

    [Fact]
    public async Task DeveRetornarSlotVazio_QuandoProfissionalSemDisponibilidade()
    {
        await using var ctx = BuildContext();
        var serviceId = Guid.NewGuid();
        ctx.Services.Add(MakeService(serviceId));
        await ctx.SaveChangesAsync();

        // No Availability seeded for the professional
        var handler = new GetAvailableSlotsQueryHandler(ctx);
        var result = await handler.Handle(
            new GetAvailableSlotsQuery(Guid.NewGuid(), serviceId, TestDate), default);

        Assert.Empty(result);
    }

    [Fact]
    public async Task DeveRemoverSlot_QuandoBookingExisteNaJanela()
    {
        await using var ctx = BuildContext();
        var serviceId = Guid.NewGuid();
        var profId = Guid.NewGuid();
        var service = MakeService(serviceId, 60);
        ctx.Services.Add(service);

        ctx.Availabilities.Add(MakeAvailability(profId, TestDate.DayOfWeek,
            new TimeOnly(9, 0), new TimeOnly(18, 0)));

        // Booking occupying the 09:00 slot
        var slotStart = DateTime.SpecifyKind(TestDate.ToDateTime(new TimeOnly(9, 0)), DateTimeKind.Utc);
        ctx.Bookings.Add(new Booking
        {
            Id = Guid.NewGuid(),
            TenantId = Guid.NewGuid(),
            EstablishmentId = Guid.NewGuid(),
            ProfessionalId = profId,
            ServiceId = serviceId,
            ClientId = Guid.NewGuid(),
            ScheduledAt = slotStart,
            EndsAt = slotStart.AddMinutes(60),
            Status = BookingStatus.Confirmado,
            Source = BookingSource.Online,
            CancelToken = Guid.NewGuid().ToString()
        });

        await ctx.SaveChangesAsync();

        var handler = new GetAvailableSlotsQueryHandler(ctx);
        var result = await handler.Handle(
            new GetAvailableSlotsQuery(profId, serviceId, TestDate), default);

        Assert.DoesNotContain(result, s => s.Start == slotStart);
    }

    [Fact]
    public async Task DeveIgnorarBookingCancelado_AoCalcularSlots()
    {
        await using var ctx = BuildContext();
        var serviceId = Guid.NewGuid();
        var profId = Guid.NewGuid();
        ctx.Services.Add(MakeService(serviceId, 60));
        ctx.Availabilities.Add(MakeAvailability(profId, TestDate.DayOfWeek,
            new TimeOnly(9, 0), new TimeOnly(10, 0)));

        var slotStart = DateTime.SpecifyKind(TestDate.ToDateTime(new TimeOnly(9, 0)), DateTimeKind.Utc);
        ctx.Bookings.Add(new Booking
        {
            Id = Guid.NewGuid(),
            TenantId = Guid.NewGuid(),
            EstablishmentId = Guid.NewGuid(),
            ProfessionalId = profId,
            ServiceId = serviceId,
            ClientId = Guid.NewGuid(),
            ScheduledAt = slotStart,
            EndsAt = slotStart.AddMinutes(60),
            Status = BookingStatus.Cancelado, // cancelado — NÃO deve bloquear slot
            Source = BookingSource.Online,
            CancelToken = Guid.NewGuid().ToString()
        });

        await ctx.SaveChangesAsync();

        var handler = new GetAvailableSlotsQueryHandler(ctx);
        var result = await handler.Handle(
            new GetAvailableSlotsQuery(profId, serviceId, TestDate), default);

        Assert.Contains(result, s => s.Start == slotStart);
    }

    [Fact]
    public async Task DeveRetornarSlots_QuandoProfissionalTemDisponibilidade()
    {
        await using var ctx = BuildContext();
        var serviceId = Guid.NewGuid();
        var profId = Guid.NewGuid();
        ctx.Services.Add(MakeService(serviceId, 30));
        ctx.Availabilities.Add(MakeAvailability(profId, TestDate.DayOfWeek,
            new TimeOnly(9, 0), new TimeOnly(11, 0)));

        await ctx.SaveChangesAsync();

        var handler = new GetAvailableSlotsQueryHandler(ctx);
        var result = await handler.Handle(
            new GetAvailableSlotsQuery(profId, serviceId, TestDate), default);

        // 09:00–11:00 with 30-min slots = 4 slots
        Assert.Equal(4, result.Count);
    }

    [Fact]
    public async Task DeveBloquearSlot_QuandoDataBloqueada()
    {
        await using var ctx = BuildContext();
        var serviceId = Guid.NewGuid();
        var profId = Guid.NewGuid();
        ctx.Services.Add(MakeService(serviceId, 60));
        ctx.Availabilities.Add(MakeAvailability(profId, TestDate.DayOfWeek,
            new TimeOnly(9, 0), new TimeOnly(12, 0)));

        ctx.BlockedSlots.Add(new BlockedSlot
        {
            Id = Guid.NewGuid(),
            TenantId = Guid.NewGuid(),
            ProfessionalId = profId,
            Date = TestDate,
            StartTime = new TimeOnly(9, 0),
            EndTime = new TimeOnly(10, 0),
            Reason = "Reunião"
        });

        await ctx.SaveChangesAsync();

        var handler = new GetAvailableSlotsQueryHandler(ctx);
        var result = await handler.Handle(
            new GetAvailableSlotsQuery(profId, serviceId, TestDate), default);

        var blockedSlotStart = DateTime.SpecifyKind(TestDate.ToDateTime(new TimeOnly(9, 0)), DateTimeKind.Utc);
        Assert.DoesNotContain(result, s => s.Start == blockedSlotStart);
        // 10:00 and 11:00 should still be available
        Assert.True(result.Count >= 2);
    }
}
