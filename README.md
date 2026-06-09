# AgendaEstilo — Agendamento inteligente para salões e barbearias

Plataforma SaaS multi-tenant para gestão de agendamentos em salões de beleza, barbearias e estabelecimentos de estética.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| **API** | .NET 8 Minimal APIs + MediatR (CQRS) |
| **Banco** | PostgreSQL (EF Core 8, multi-tenant via TenantId) |
| **Jobs** | Hangfire (lembretes 24h e 1h antes) |
| **Storage** | Cloudflare R2 (S3-compatible) |
| **Notificações** | Evolution API (WhatsApp) + Resend (e-mail) |
| **Frontend** | Next.js 14 App Router + Tailwind CSS |
| **Auth** | JWT (8h) + Refresh Token (30d) |

## Pré-requisitos

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 20+](https://nodejs.org/)
- [Docker & Docker Compose](https://docs.docker.com/compose/)

## Variáveis de ambiente

Crie `src/AgendaEstilo.Api/appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=agendaestilo;Username=postgres;Password=postgres"
  },
  "Jwt": {
    "Secret": "sua-chave-secreta-com-minimo-32-caracteres",
    "Issuer": "AgendaEstilo",
    "Audience": "AgendaEstilo"
  },
  "Hangfire": {
    "ConnectionString": "Host=localhost;Port=5432;Database=agendaestilo;Username=postgres;Password=postgres"
  },
  "AllowedOrigins": ["http://localhost:3000"],
  "Storage": {
    "Endpoint": "https://SEU_ACCOUNT_ID.r2.cloudflarestorage.com",
    "AccessKey": "SEU_ACCESS_KEY",
    "SecretKey": "SEU_SECRET_KEY",
    "BucketName": "agendaestilo"
  },
  "Evolution": {
    "BaseUrl": "https://sua-evolution-api.com",
    "ApiKey": "SUA_API_KEY",
    "Instance": "agendaestilo"
  },
  "Resend": {
    "ApiKey": "re_XXXX"
  }
}
```

Crie `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Rodar localmente

```bash
# 1. Subir banco de dados
docker compose up -d

# 2. Aplicar migrations
dotnet ef database update -p src/AgendaEstilo.Infrastructure -s src/AgendaEstilo.Api

# 3. Rodar a API
dotnet run --project src/AgendaEstilo.Api

# 4. Rodar o frontend (outro terminal)
cd frontend
npm install
npm run dev
```

Acesse em: http://localhost:3000

## Rodar testes

```bash
dotnet test tests/AgendaEstilo.Tests
```

Os testes cobrem cálculo de slots de disponibilidade e criação de agendamentos.

## Migrations

```bash
# Criar nova migration
dotnet ef migrations add NomeDaMigration \
  -p src/AgendaEstilo.Infrastructure \
  -s src/AgendaEstilo.Api

# Aplicar migrations
dotnet ef database update \
  -p src/AgendaEstilo.Infrastructure \
  -s src/AgendaEstilo.Api
```

## Deploy — Railway + Neon + Cloudflare R2

### 1. Banco de dados (Neon)

1. Crie um projeto em [neon.tech](https://neon.tech)
2. Copie a connection string no formato:
   ```
   Host=ep-xxx.us-east-2.aws.neon.tech;Database=agendaestilo;Username=user;Password=pass;SSL Mode=Require
   ```

### 2. Storage (Cloudflare R2)

1. Crie um bucket R2 no [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Gere um API Token com permissão de escrita no bucket
3. Configure as variáveis `Storage.*` no Railway

### 3. WhatsApp (Evolution API)

1. Deploy da Evolution API em Railway ou VPS
2. Configure uma instância e conecte um número WhatsApp
3. Configure as variáveis `Evolution.*`

### 4. API (Railway)

1. Conecte seu repositório no [Railway](https://railway.app)
2. Configure as variáveis de ambiente (use as mesmas chaves do `appsettings.json`)
3. O `Dockerfile` na raiz já está configurado para build e run na porta 8080

### 5. Frontend (Vercel)

```bash
cd frontend
vercel --prod
```

Configure a variável de ambiente `NEXT_PUBLIC_API_URL` com a URL do Railway.

## Estrutura do projeto

```
AgendaEstilo/
├── src/
│   ├── AgendaEstilo.Api/          # Endpoints, middleware, Program.cs
│   ├── AgendaEstilo.Application/  # Commands, queries, handlers (CQRS)
│   ├── AgendaEstilo.Domain/       # Entidades, enums, interfaces
│   └── AgendaEstilo.Infrastructure/ # DbContext, serviços externos
├── tests/
│   └── AgendaEstilo.Tests/        # xUnit + Moq
├── frontend/                      # Next.js 14 App Router
│   ├── app/
│   │   ├── (auth)/                # Login, cadastro
│   │   ├── (dashboard)/           # Painel administrativo
│   │   └── (public)/[slug]/       # Página pública de agendamento
│   ├── components/
│   └── lib/
├── docker-compose.yml
└── Dockerfile
```

## Funcionalidades

- **Agendamento online** via link público por estabelecimento (`/[slug]`)
- **Dashboard** com métricas do dia (receita prevista vs. realizada)
- **Walk-in / agendamento manual** direto pelo painel
- **Gestão de profissionais, serviços e disponibilidade**
- **Clientes** com histórico completo de visitas e observações
- **Relatórios** de receita, ocupação e origem dos agendamentos
- **Lembretes automáticos** 24h e 1h antes via WhatsApp
- **Prevenção de double-booking** com transações serializáveis
- **Multi-tenant** com isolamento por TenantId e soft delete
