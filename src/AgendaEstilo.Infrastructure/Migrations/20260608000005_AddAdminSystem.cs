using System;
using AgendaEstilo.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgendaEstilo.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260608000005_AddAdminSystem")]
    public partial class AddAdminSystem : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── system_users ────────────────────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "system_users",
                columns: table => new
                {
                    Id                  = table.Column<Guid>(type: "uuid", nullable: false),
                    Name                = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Email               = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PasswordHash        = table.Column<string>(type: "text", nullable: false),
                    Role                = table.Column<int>(type: "integer", nullable: false),
                    IsActive            = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    PromoterCode        = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    CommissionPercent   = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false, defaultValue: 20m),
                    MustChangePassword  = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    RefreshToken        = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    RefreshTokenExpiry  = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    InvitedByAdminId    = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt           = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt           = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_system_users", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_system_users_Email",
                table: "system_users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_system_users_PromoterCode",
                table: "system_users",
                column: "PromoterCode",
                unique: true,
                filter: "\"PromoterCode\" IS NOT NULL");

            // ── plan_subscription_payments ──────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "plan_subscription_payments",
                columns: table => new
                {
                    Id                = table.Column<Guid>(type: "uuid", nullable: false),
                    EstablishmentId   = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId          = table.Column<Guid>(type: "uuid", nullable: false),
                    Plan              = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Amount            = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ExternalPaymentId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    PaidAt            = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt         = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_plan_subscription_payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_plan_subscription_payments_establishments_EstablishmentId",
                        column: x => x.EstablishmentId,
                        principalTable: "establishments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_plan_subscription_payments_EstablishmentId",
                table: "plan_subscription_payments",
                column: "EstablishmentId");

            migrationBuilder.CreateIndex(
                name: "IX_plan_subscription_payments_PaidAt",
                table: "plan_subscription_payments",
                column: "PaidAt");

            // ── promoter_conversions ────────────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "promoter_conversions",
                columns: table => new
                {
                    Id               = table.Column<Guid>(type: "uuid", nullable: false),
                    PromoterId       = table.Column<Guid>(type: "uuid", nullable: false),
                    EstablishmentId  = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId         = table.Column<Guid>(type: "uuid", nullable: false),
                    Plan             = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PlanAmount       = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CommissionAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ConvertedAt      = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt        = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_promoter_conversions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_promoter_conversions_system_users_PromoterId",
                        column: x => x.PromoterId,
                        principalTable: "system_users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_promoter_conversions_establishments_EstablishmentId",
                        column: x => x.EstablishmentId,
                        principalTable: "establishments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_promoter_conversions_PromoterId",
                table: "promoter_conversions",
                column: "PromoterId");

            migrationBuilder.CreateIndex(
                name: "IX_promoter_conversions_EstablishmentId",
                table: "promoter_conversions",
                column: "EstablishmentId",
                unique: true);

            // ── Establishment: ReferralCode ─────────────────────────────────────────
            migrationBuilder.AddColumn<string>(
                name: "ReferralCode",
                table: "establishments",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "ReferralCode", table: "establishments");

            migrationBuilder.DropTable(name: "promoter_conversions");
            migrationBuilder.DropTable(name: "plan_subscription_payments");
            migrationBuilder.DropTable(name: "system_users");
        }
    }
}
