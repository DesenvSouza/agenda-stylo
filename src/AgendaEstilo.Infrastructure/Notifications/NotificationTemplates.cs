namespace AgendaEstilo.Infrastructure.Notifications;

public static class NotificationTemplates
{
    public static string ClientConfirmation(
        string clientName, string serviceName, string professionalName,
        string dayOfWeek, string date, string time,
        string address, string cancelUrl, string establishmentName) =>
        $"""
        Olá, {clientName}! 👋
        Seu agendamento foi confirmado!

        📋 *{serviceName}*
        💈 Profissional: {professionalName}
        📅 {dayOfWeek}, {date} às {time}
        📍 {address}

        _Caso precise cancelar:_
        {cancelUrl}

        — {establishmentName}
        """;

    public static string ClientReminder24h(
        string clientName, string serviceName, string time,
        string professionalName, string address,
        string cancelUrl, string establishmentName) =>
        $"""
        Olá, {clientName}! Lembrando que amanhã você tem:

        📋 *{serviceName}* às *{time}*
        💈 com {professionalName}
        📍 {address}

        _Precisa cancelar ou reagendar?_
        {cancelUrl}

        — {establishmentName}
        """;

    public static string ClientReminder1h(
        string clientName, string serviceName, string time,
        string address, string establishmentName) =>
        $"""
        Oi, {clientName}! 👋 Em 1 hora é a sua vez!

        ⏰ *{serviceName}* às *{time}*
        📍 Te esperamos em {address}

        — {establishmentName}
        """;

    public static string ClientCancellation(
        string clientName, string serviceName, string date, string time,
        string establishmentUrl, string establishmentName) =>
        $"""
        Olá, {clientName}. Seu agendamento de *{serviceName}* no dia {date} às {time} foi cancelado.
        Para reagendar: {establishmentUrl}
        — {establishmentName}
        """;

    public static string ProfessionalNewBooking(
        string serviceName, string clientName,
        string dayOfWeek, string date, string time, string clientPhone) =>
        $"""
        Novo agendamento! 📅
        {serviceName} com {clientName}
        {dayOfWeek}, {date} às {time}
        📱 {clientPhone}
        — AgendaEstilo
        """;

    public static string ClientThankYou(
        string clientName, string serviceName, string establishmentName, string establishmentUrl) =>
        $"""
        Obrigado pela visita, {clientName}! 🙏
        Foi um prazer ter você no *{establishmentName}*.
        Seu *{serviceName}* foi concluído com sucesso!
        Agende novamente quando quiser: {establishmentUrl}
        """;

    public static string ProfessionalNewBookingEmail(
        string serviceName, string clientName,
        string dayOfWeek, string date, string time, string clientPhone) =>
        $"""
        <h2>Novo agendamento</h2>
        <p><strong>Serviço:</strong> {serviceName}</p>
        <p><strong>Cliente:</strong> {clientName}</p>
        <p><strong>Data:</strong> {dayOfWeek}, {date} às {time}</p>
        <p><strong>Telefone:</strong> {clientPhone}</p>
        """;
}
