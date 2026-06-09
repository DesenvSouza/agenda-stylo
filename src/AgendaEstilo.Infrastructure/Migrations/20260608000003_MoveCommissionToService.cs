using AgendaEstilo.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgendaEstilo.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260608000003_MoveCommissionToService")]
    public partial class MoveCommissionToService : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Remove comissão do profissional (era por profissional, agora é por serviço)
            migrationBuilder.DropColumn(
                name: "CommissionRate",
                table: "professionals");

            // Adiciona tipo de comissão ao serviço (0=None, 1=Percentage, 2=Fixed)
            migrationBuilder.AddColumn<int>(
                name: "CommissionType",
                table: "Services",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Adiciona valor da comissão (% ou R$ fixo dependendo do tipo)
            migrationBuilder.AddColumn<decimal>(
                name: "CommissionValue",
                table: "Services",
                type: "numeric(10,2)",
                nullable: false,
                defaultValue: 0m);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CommissionType",
                table: "Services");

            migrationBuilder.DropColumn(
                name: "CommissionValue",
                table: "Services");

            migrationBuilder.AddColumn<decimal>(
                name: "CommissionRate",
                table: "professionals",
                type: "numeric(5,2)",
                nullable: false,
                defaultValue: 0m);
        }
    }
}
