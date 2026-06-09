using AgendaEstilo.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgendaEstilo.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260604000002_AddEstablishmentNotificationSettings")]
    public partial class AddEstablishmentNotificationSettings : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContactEmail",
                table: "establishments",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NotificationSettingsJson",
                table: "establishments",
                type: "text",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "ContactEmail", table: "establishments");
            migrationBuilder.DropColumn(name: "NotificationSettingsJson", table: "establishments");
        }
    }
}
