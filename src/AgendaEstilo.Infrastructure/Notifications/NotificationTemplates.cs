namespace AgendaEstilo.Infrastructure.Notifications;

public static class NotificationTemplates
{
    // ── Layout base ──────────────────────────────────────────────────────────

    private static string Layout(string title, string preheader, string content, string? footerNote = null) => $"""
        <!DOCTYPE html>
        <html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>{title}</title>
          <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
        </head>
        <body style="margin:0;padding:0;background-color:#F0EFE9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
          <!-- Preheader oculto -->
          <div style="display:none;max-height:0;overflow:hidden;color:#F0EFE9;font-size:1px;">{preheader}&nbsp;&#847; &zwnj; &nbsp;&#847; &zwnj;</div>

          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F0EFE9;">
            <tr>
              <td align="center" style="padding:48px 16px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

                  <!-- Logo -->
                  <tr>
                    <td align="center" style="padding-bottom:28px;">
                      <div style="display:inline-block;background-color:#1B1B1B;border-radius:14px;padding:14px 28px;mso-padding-alt:14px 28px;">
                        <span style="color:#EF9F27;font-size:22px;font-weight:800;letter-spacing:-0.5px;text-decoration:none;">AgendaEstilo</span>
                      </div>
                    </td>
                  </tr>

                  <!-- Card principal -->
                  <tr>
                    <td style="background-color:#FFFFFF;border-radius:20px;overflow:hidden;">
                      <!-- Barra dourada -->
                      <div style="background:linear-gradient(90deg,#EF9F27 0%,#F7C060 100%);height:5px;font-size:0;line-height:0;">&nbsp;</div>
                      <!-- Conteúdo -->
                      <div style="padding:40px 40px 36px 40px;">
                        {content}
                      </div>
                    </td>
                  </tr>

                  <!-- Rodapé -->
                  <tr>
                    <td align="center" style="padding:28px 0 0 0;">
                      <p style="color:#9B9B9B;font-size:12px;margin:0 0 6px 0;line-height:1.6;">{footerNote ?? "Você está recebendo este e-mail porque tem um agendamento registrado."}</p>
                      <p style="color:#C0C0C0;font-size:11px;margin:0;">© 2025 AgendaEstilo · Todos os direitos reservados</p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """;

    private static string Button(string label, string url, string color = "#EF9F27", string textColor = "#1B1B1B") => $"""
        <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
          <tr>
            <td align="center" style="background-color:{color};border-radius:12px;padding:0;">
              <a href="{url}" style="display:inline-block;background-color:{color};color:{textColor};font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px;letter-spacing:0.2px;">{label}</a>
            </td>
          </tr>
        </table>
        """;

    private static string DetailCard(string content) => $"""
        <div style="background-color:#FAFAF8;border-radius:14px;padding:20px 22px;margin:20px 0;">
          {content}
        </div>
        """;

    private static string DetailRow(string emoji, string label, string value) => $"""
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:12px;">
          <tr>
            <td style="width:28px;vertical-align:top;padding-top:1px;font-size:16px;">{emoji}</td>
            <td style="vertical-align:top;">
              <span style="color:#9B9B9B;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:2px;">{label}</span>
              <span style="color:#1B1B1B;font-size:14px;font-weight:600;">{value}</span>
            </td>
          </tr>
        </table>
        """;

    private static string Divider() =>
        "<div style=\"height:1px;background-color:#F0EFE9;margin:24px 0;\"></div>";

    // ── Boas-vindas (após cadastro) ──────────────────────────────────────────

    public static string Welcome(string establishmentName, string ownerEmail, string loginUrl) =>
        Layout(
            title: "Bem-vindo ao AgendaEstilo!",
            preheader: $"Seu estabelecimento {establishmentName} já está no ar!",
            content: $"""
                <h1 style="color:#1B1B1B;font-size:26px;font-weight:800;margin:0 0 8px 0;letter-spacing:-0.5px;">Bem-vindo ao AgendaEstilo! 🎉</h1>
                <p style="color:#6B6B6B;font-size:15px;margin:0 0 28px 0;line-height:1.6;">
                  O <strong style="color:#1B1B1B;">{establishmentName}</strong> agora tem agendamento online. Seus clientes já podem marcar horários pelo link do seu estabelecimento.
                </p>

                {DetailCard($"""
                    <p style="color:#1B1B1B;font-size:13px;font-weight:700;margin:0 0 16px 0;text-transform:uppercase;letter-spacing:0.5px;">Próximos passos</p>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding-bottom:12px;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="width:32px;vertical-align:top;">
                                <div style="width:24px;height:24px;background-color:#EF9F27;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:800;color:#1B1B1B;">1</div>
                              </td>
                              <td style="vertical-align:top;padding-top:3px;">
                                <span style="color:#1B1B1B;font-size:13px;font-weight:600;">Acesse o painel</span>
                                <span style="color:#9B9B9B;font-size:12px;display:block;margin-top:1px;">Gerencie horários, serviços e profissionais</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:12px;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="width:32px;vertical-align:top;">
                                <div style="width:24px;height:24px;background-color:#EF9F27;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:800;color:#1B1B1B;">2</div>
                              </td>
                              <td style="vertical-align:top;padding-top:3px;">
                                <span style="color:#1B1B1B;font-size:13px;font-weight:600;">Cadastre seus serviços e profissionais</span>
                                <span style="color:#9B9B9B;font-size:12px;display:block;margin-top:1px;">Configure preços, duração e disponibilidade</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="width:32px;vertical-align:top;">
                                <div style="width:24px;height:24px;background-color:#EF9F27;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:800;color:#1B1B1B;">3</div>
                              </td>
                              <td style="vertical-align:top;padding-top:3px;">
                                <span style="color:#1B1B1B;font-size:13px;font-weight:600;">Compartilhe seu link de agendamento</span>
                                <span style="color:#9B9B9B;font-size:12px;display:block;margin-top:1px;">Envie para clientes, coloque no Instagram e WhatsApp</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                """)}

                <div style="margin-top:28px;text-align:center;">
                  {Button("Acessar meu painel", loginUrl)}
                </div>

                {Divider()}

                <p style="color:#9B9B9B;font-size:12px;margin:0;text-align:center;line-height:1.6;">
                  Seu e-mail de acesso: <strong style="color:#6B6B6B;">{ownerEmail}</strong>
                </p>
                """,
            footerNote: "Você recebeu este e-mail porque criou uma conta no AgendaEstilo."
        );

    // ── Confirmação de agendamento (para o cliente) ──────────────────────────

    public static string ClientConfirmationEmail(
        string clientName, string serviceName, string professionalName,
        string dayOfWeek, string date, string time,
        string address, string cancelUrl, string establishmentName) =>
        Layout(
            title: $"Agendamento confirmado — {establishmentName}",
            preheader: $"{serviceName} confirmado para {date} às {time}",
            content: $"""
                <p style="color:#EF9F27;font-size:13px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;margin:0 0 8px 0;">Agendamento confirmado ✓</p>
                <h1 style="color:#1B1B1B;font-size:24px;font-weight:800;margin:0 0 8px 0;letter-spacing:-0.5px;">Tudo certo, {clientName}!</h1>
                <p style="color:#6B6B6B;font-size:15px;margin:0 0 24px 0;line-height:1.6;">
                  Seu agendamento em <strong style="color:#1B1B1B;">{establishmentName}</strong> foi confirmado. Guarde os detalhes abaixo.
                </p>

                {DetailCard($"""
                    {DetailRow("✂️", "Serviço", serviceName)}
                    {DetailRow("👤", "Profissional", professionalName)}
                    {DetailRow("📅", "Data", $"{char.ToUpper(dayOfWeek[0])}{dayOfWeek[1..]}, {date}")}
                    {DetailRow("🕐", "Horário", time)}
                    {DetailRow("📍", "Local", address)}
                """)}

                <div style="text-align:center;margin-top:28px;">
                  {Button("Ver ou cancelar agendamento", cancelUrl, "#1B1B1B", "#FFFFFF")}
                </div>

                {Divider()}

                <p style="color:#9B9B9B;font-size:12px;margin:0;text-align:center;line-height:1.6;">
                  Precisa remarcar? Cancele pelo link acima e agende um novo horário.
                </p>
                """,
            footerNote: $"Você recebeu este e-mail porque realizou um agendamento em {establishmentName}."
        );

    // ── Lembrete 24h (para o cliente) ────────────────────────────────────────

    public static string ClientReminder24hEmail(
        string clientName, string serviceName, string time,
        string professionalName, string address,
        string cancelUrl, string establishmentName) =>
        Layout(
            title: $"Lembrete: {serviceName} amanhã às {time}",
            preheader: $"Amanhã às {time} você tem {serviceName} agendado!",
            content: $"""
                <p style="color:#EF9F27;font-size:13px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;margin:0 0 8px 0;">Lembrete · 24 horas</p>
                <h1 style="color:#1B1B1B;font-size:24px;font-weight:800;margin:0 0 8px 0;letter-spacing:-0.5px;">Amanhã é o dia, {clientName}! 📅</h1>
                <p style="color:#6B6B6B;font-size:15px;margin:0 0 24px 0;line-height:1.6;">
                  Você tem um agendamento amanhã. Não esqueça!
                </p>

                {DetailCard($"""
                    {DetailRow("✂️", "Serviço", serviceName)}
                    {DetailRow("👤", "Profissional", professionalName)}
                    {DetailRow("🕐", "Horário", time)}
                    {DetailRow("📍", "Local", address)}
                """)}

                <div style="text-align:center;margin-top:28px;">
                  {Button("Cancelar agendamento", cancelUrl, "#F5F5F0", "#6B6B6B")}
                </div>

                {Divider()}

                <p style="color:#9B9B9B;font-size:12px;margin:0;text-align:center;line-height:1.6;">
                  Não consegue comparecer? Cancele com antecedência pelo botão acima.
                </p>
                """,
            footerNote: $"Lembrete automático de {establishmentName}."
        );

    // ── Lembrete 1h (para o cliente) ─────────────────────────────────────────

    public static string ClientReminder1hEmail(
        string clientName, string serviceName, string time,
        string address, string establishmentName) =>
        Layout(
            title: $"Em 1 hora: {serviceName} às {time}",
            preheader: $"Sua vez chega em 1 hora! {serviceName} às {time}.",
            content: $"""
                <p style="color:#EF9F27;font-size:13px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;margin:0 0 8px 0;">Lembrete · 1 hora</p>
                <h1 style="color:#1B1B1B;font-size:24px;font-weight:800;margin:0 0 8px 0;letter-spacing:-0.5px;">Em 1 hora é a sua vez! ⏰</h1>
                <p style="color:#6B6B6B;font-size:15px;margin:0 0 24px 0;line-height:1.6;">
                  Olá, <strong style="color:#1B1B1B;">{clientName}</strong>! Sua hora está chegando. Saia com tempo!
                </p>

                {DetailCard($"""
                    {DetailRow("✂️", "Serviço", serviceName)}
                    {DetailRow("🕐", "Horário", time)}
                    {DetailRow("📍", "Local", address)}
                """)}

                {Divider()}

                <p style="color:#9B9B9B;font-size:12px;margin:0;text-align:center;line-height:1.6;">
                  Te esperamos em breve em <strong style="color:#6B6B6B;">{establishmentName}</strong>!
                </p>
                """,
            footerNote: $"Lembrete automático de {establishmentName}."
        );

    // ── Cancelamento (para o cliente) ────────────────────────────────────────

    public static string ClientCancellationEmail(
        string clientName, string serviceName, string date, string time,
        string establishmentUrl, string establishmentName) =>
        Layout(
            title: $"Agendamento cancelado — {establishmentName}",
            preheader: $"Seu agendamento de {serviceName} em {date} foi cancelado.",
            content: $"""
                <p style="color:#9B9B9B;font-size:13px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;margin:0 0 8px 0;">Agendamento cancelado</p>
                <h1 style="color:#1B1B1B;font-size:24px;font-weight:800;margin:0 0 8px 0;letter-spacing:-0.5px;">Olá, {clientName}</h1>
                <p style="color:#6B6B6B;font-size:15px;margin:0 0 24px 0;line-height:1.6;">
                  Seu agendamento abaixo foi <strong style="color:#1B1B1B;">cancelado</strong>. Sentimos muito por qualquer inconveniente.
                </p>

                {DetailCard($"""
                    {DetailRow("✂️", "Serviço", serviceName)}
                    {DetailRow("📅", "Data", date)}
                    {DetailRow("🕐", "Horário", time)}
                    {DetailRow("🏢", "Estabelecimento", establishmentName)}
                """)}

                <div style="text-align:center;margin-top:28px;">
                  {Button("Reagendar agora", establishmentUrl)}
                </div>

                {Divider()}

                <p style="color:#9B9B9B;font-size:12px;margin:0;text-align:center;line-height:1.6;">
                  Ficamos à disposição para um novo agendamento.
                </p>
                """,
            footerNote: $"Notificação automática de {establishmentName}."
        );

    // ── Obrigado pela visita (para o cliente) ────────────────────────────────

    public static string ClientThankYouEmail(
        string clientName, string serviceName,
        string establishmentName, string establishmentUrl) =>
        Layout(
            title: $"Obrigado pela visita — {establishmentName}",
            preheader: $"Obrigado, {clientName}! Foi um prazer te atender.",
            content: $"""
                <h1 style="color:#1B1B1B;font-size:26px;font-weight:800;margin:0 0 8px 0;letter-spacing:-0.5px;">Obrigado pela visita! 🙏</h1>
                <p style="color:#6B6B6B;font-size:15px;margin:0 0 24px 0;line-height:1.6;">
                  Olá, <strong style="color:#1B1B1B;">{clientName}</strong>! Foi um prazer te receber em <strong style="color:#1B1B1B;">{establishmentName}</strong>.
                  Seu <strong style="color:#1B1B1B;">{serviceName}</strong> foi concluído com sucesso!
                </p>

                <div style="background-color:#FAFAF8;border-radius:14px;padding:22px;text-align:center;margin-bottom:24px;">
                  <p style="color:#EF9F27;font-size:32px;margin:0 0 8px 0;">⭐</p>
                  <p style="color:#1B1B1B;font-size:15px;font-weight:700;margin:0 0 4px 0;">Gostou do atendimento?</p>
                  <p style="color:#9B9B9B;font-size:13px;margin:0;">Volte sempre que quiser. Seu próximo horário está a um clique de distância.</p>
                </div>

                <div style="text-align:center;margin-top:24px;">
                  {Button("Agendar novamente", establishmentUrl)}
                </div>
                """,
            footerNote: $"Você esteve em {establishmentName}. Saudades!"
        );

    // ── Novo agendamento (para o profissional) ───────────────────────────────

    public static string ProfessionalNewBookingEmail(
        string serviceName, string clientName,
        string dayOfWeek, string date, string time, string clientPhone) =>
        Layout(
            title: $"Novo agendamento: {serviceName} com {clientName}",
            preheader: $"{clientName} agendou {serviceName} para {date} às {time}.",
            content: $"""
                <p style="color:#EF9F27;font-size:13px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;margin:0 0 8px 0;">Novo agendamento</p>
                <h1 style="color:#1B1B1B;font-size:24px;font-weight:800;margin:0 0 8px 0;letter-spacing:-0.5px;">Você tem um novo cliente! 🎉</h1>
                <p style="color:#6B6B6B;font-size:15px;margin:0 0 24px 0;line-height:1.6;">
                  Um novo agendamento foi registrado para você. Confira os detalhes abaixo.
                </p>

                {DetailCard($"""
                    {DetailRow("✂️", "Serviço", serviceName)}
                    {DetailRow("👤", "Cliente", clientName)}
                    {DetailRow("📅", "Data", $"{char.ToUpper(dayOfWeek[0])}{dayOfWeek[1..]}, {date}")}
                    {DetailRow("🕐", "Horário", time)}
                    {DetailRow("📱", "Contato", clientPhone)}
                """)}

                {Divider()}

                <p style="color:#9B9B9B;font-size:12px;margin:0;text-align:center;line-height:1.6;">
                  Este e-mail é uma notificação automática do AgendaEstilo.
                </p>
                """,
            footerNote: "Notificação de novo agendamento do AgendaEstilo."
        );

    // ── Cancelamento notificado ao profissional ──────────────────────────────

    public static string ProfessionalCancellationEmail(
        string serviceName, string clientName, string date, string time) =>
        Layout(
            title: $"Agendamento cancelado: {serviceName} com {clientName}",
            preheader: $"{clientName} cancelou o agendamento de {serviceName} em {date}.",
            content: $"""
                <p style="color:#9B9B9B;font-size:13px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;margin:0 0 8px 0;">Agendamento cancelado</p>
                <h1 style="color:#1B1B1B;font-size:24px;font-weight:800;margin:0 0 8px 0;letter-spacing:-0.5px;">Um agendamento foi cancelado</h1>
                <p style="color:#6B6B6B;font-size:15px;margin:0 0 24px 0;line-height:1.6;">
                  O seguinte agendamento foi cancelado pelo cliente ou pelo sistema.
                </p>

                {DetailCard($"""
                    {DetailRow("✂️", "Serviço", serviceName)}
                    {DetailRow("👤", "Cliente", clientName)}
                    {DetailRow("📅", "Data", date)}
                    {DetailRow("🕐", "Horário", time)}
                """)}

                {Divider()}

                <p style="color:#9B9B9B;font-size:12px;margin:0;text-align:center;line-height:1.6;">
                  O horário ficará disponível automaticamente para novos agendamentos.
                </p>
                """,
            footerNote: "Notificação automática do AgendaEstilo."
        );

    // ── Convite de promotor ──────────────────────────────────────────────────

    public static string PromoterInvite(
        string name, string email, string tempPassword,
        string promoterCode, decimal commissionPercent,
        string loginUrl, string referralUrl) =>
        Layout(
            title: "Você foi convidado a ser Promotor — AgendaEstilo",
            preheader: $"Bem-vindo ao time, {name}! Seu código de promotor é {promoterCode}.",
            content: $"""
                <p style="color:#EF9F27;font-size:13px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;margin:0 0 8px 0;">Convite de promotor</p>
                <h1 style="color:#1B1B1B;font-size:24px;font-weight:800;margin:0 0 8px 0;letter-spacing:-0.5px;">Olá, {name}! 👋</h1>
                <p style="color:#6B6B6B;font-size:15px;margin:0 0 24px 0;line-height:1.6;">
                  Você foi convidado para ser <strong style="color:#1B1B1B;">Promotor do AgendaEstilo</strong>. Indique estabelecimentos e ganhe
                  <strong style="color:#EF9F27;">{commissionPercent:0.##}% de comissão</strong> em cada plano contratado pelo seu link.
                </p>

                <!-- Credenciais de acesso -->
                {DetailCard($"""
                    <p style="color:#1B1B1B;font-size:13px;font-weight:700;margin:0 0 14px 0;text-transform:uppercase;letter-spacing:0.5px;">Credenciais de acesso</p>
                    {DetailRow("📧", "E-mail", email)}
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="width:28px;vertical-align:top;padding-top:1px;font-size:16px;">🔑</td>
                        <td style="vertical-align:top;">
                          <span style="color:#9B9B9B;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px;">Senha temporária</span>
                          <code style="background:#1B1B1B;color:#EF9F27;font-size:15px;font-weight:700;padding:6px 14px;border-radius:8px;letter-spacing:2px;display:inline-block;">{tempPassword}</code>
                          <span style="color:#9B9B9B;font-size:11px;display:block;margin-top:4px;">⚠ Você será obrigado a alterar a senha no primeiro acesso.</span>
                        </td>
                      </tr>
                    </table>
                """)}

                <!-- Código de indicação -->
                <div style="background:linear-gradient(135deg,#1B1B1B 0%,#2D2D2D 100%);border-radius:16px;padding:24px;margin:20px 0;text-align:center;">
                  <p style="color:#9B9B9B;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px 0;">Seu código de indicação</p>
                  <p style="color:#EF9F27;font-size:32px;font-weight:800;letter-spacing:8px;margin:0 0 12px 0;font-family:monospace;">{promoterCode}</p>
                  <p style="color:#666;font-size:12px;margin:0 0 14px 0;">Compartilhe este link com estabelecimentos:</p>
                  <div style="background:#111;border-radius:10px;padding:10px 16px;display:inline-block;">
                    <a href="{referralUrl}" style="color:#EF9F27;font-size:12px;text-decoration:none;word-break:break-all;">{referralUrl}</a>
                  </div>
                </div>

                <div style="text-align:center;margin-top:28px;">
                  {Button("Acessar portal do promotor", loginUrl)}
                </div>

                {Divider()}

                <p style="color:#9B9B9B;font-size:12px;margin:0;text-align:center;line-height:1.6;">
                  Acompanhe suas indicações e comissões no portal do promotor.
                </p>
                """,
            footerNote: "Você recebeu este e-mail porque foi convidado como promotor do AgendaEstilo."
        );

    // ── E-mail de teste ──────────────────────────────────────────────────────

    public static string TestEmail(string establishmentName) =>
        Layout(
            title: "Teste de notificação — AgendaEstilo",
            preheader: "As notificações por e-mail estão funcionando!",
            content: $"""
                <div style="text-align:center;margin-bottom:24px;">
                  <div style="display:inline-block;background-color:#F0FAF4;border-radius:50%;width:64px;height:64px;line-height:64px;text-align:center;font-size:28px;">✅</div>
                </div>
                <h1 style="color:#1B1B1B;font-size:24px;font-weight:800;margin:0 0 8px 0;letter-spacing:-0.5px;text-align:center;">Notificações funcionando!</h1>
                <p style="color:#6B6B6B;font-size:15px;margin:0 0 24px 0;line-height:1.6;text-align:center;">
                  As notificações por e-mail de <strong style="color:#1B1B1B;">{establishmentName}</strong> estão configuradas corretamente. Seus clientes receberão confirmações e lembretes neste canal.
                </p>

                {DetailCard($"""
                    <p style="color:#1B1B1B;font-size:13px;font-weight:700;margin:0 0 12px 0;">E-mails que serão enviados automaticamente:</p>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr><td style="padding-bottom:8px;font-size:13px;color:#6B6B6B;">✓ Confirmação de agendamento</td></tr>
                      <tr><td style="padding-bottom:8px;font-size:13px;color:#6B6B6B;">✓ Lembrete 24h antes</td></tr>
                      <tr><td style="padding-bottom:8px;font-size:13px;color:#6B6B6B;">✓ Lembrete 1h antes</td></tr>
                      <tr><td style="padding-bottom:8px;font-size:13px;color:#6B6B6B;">✓ Notificação de cancelamento</td></tr>
                      <tr><td style="font-size:13px;color:#6B6B6B;">✓ Novo agendamento para profissionais</td></tr>
                    </table>
                """)}
                """,
            footerNote: "Este é um e-mail de teste enviado pelo painel do AgendaEstilo."
        );
}
