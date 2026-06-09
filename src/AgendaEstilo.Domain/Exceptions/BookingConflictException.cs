namespace AgendaEstilo.Domain.Exceptions;

public class BookingConflictException(string message = "Horário não disponível. Escolha outro.")
    : Exception(message);
