using AgendaEstilo.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgendaEstilo.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260608000001_AddProfessionalSchedule")]
    public partial class AddProfessionalSchedule : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Múltiplas pausas por dia na disponibilidade
            migrationBuilder.AddColumn<string>(
                name: "BreaksJson",
                table: "Availabilities",
                type: "text",
                nullable: true);

            // Data final para bloqueios em intervalo (férias, licença, etc.)
            migrationBuilder.AddColumn<DateOnly>(
                name: "DateEnd",
                table: "BlockedSlots",
                type: "date",
                nullable: true);

            // Indica se o bloqueio é de dia inteiro
            migrationBuilder.AddColumn<bool>(
                name: "IsFullDay",
                table: "BlockedSlots",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            // Categoria do bloqueio: timeoff | vacation | other
            migrationBuilder.AddColumn<string>(
                name: "BlockType",
                table: "BlockedSlots",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "timeoff");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "BreaksJson",  table: "Availabilities");
            migrationBuilder.DropColumn(name: "DateEnd",     table: "BlockedSlots");
            migrationBuilder.DropColumn(name: "IsFullDay",   table: "BlockedSlots");
            migrationBuilder.DropColumn(name: "BlockType",   table: "BlockedSlots");
        }
    }
}
