using AgendaEstilo.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgendaEstilo.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260608000004_AddProfessionalAccessFeatures")]
    public partial class AddProfessionalAccessFeatures : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Professional: CPF e WhatsApp
            migrationBuilder.AddColumn<string>(
                name: "Cpf",
                table: "professionals",
                type: "character varying(14)",
                maxLength: 14,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WhatsApp",
                table: "professionals",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            // Establishment: flag de acesso para profissionais
            migrationBuilder.AddColumn<bool>(
                name: "AllowProfessionalAccess",
                table: "establishments",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Cpf",                     table: "professionals");
            migrationBuilder.DropColumn(name: "WhatsApp",                table: "professionals");
            migrationBuilder.DropColumn(name: "AllowProfessionalAccess", table: "establishments");
        }
    }
}
