using System;
using AgendaEstilo.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgendaEstilo.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260609000002_AddAnnouncements")]
    public partial class AddAnnouncements : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "announcements",
                columns: table => new
                {
                    Id            = table.Column<Guid>(type: "uuid", nullable: false),
                    Title         = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Body          = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Severity      = table.Column<int>(type: "integer", nullable: false),
                    Target        = table.Column<int>(type: "integer", nullable: false),
                    StartsAt      = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndsAt        = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ActionLabel   = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    ActionUrl     = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsDismissible = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive      = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt     = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt     = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                },
                constraints: table => table.PrimaryKey("PK_announcements", x => x.Id));

            // Índice composto para a query principal: WHERE IsActive = true AND StartsAt <= now AND EndsAt >= now
            migrationBuilder.CreateIndex(
                name: "IX_announcements_StartsAt_EndsAt",
                table: "announcements",
                columns: new[] { "StartsAt", "EndsAt" });

            migrationBuilder.CreateIndex(
                name: "IX_announcements_IsActive",
                table: "announcements",
                column: "IsActive");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "announcements");
        }
    }
}
