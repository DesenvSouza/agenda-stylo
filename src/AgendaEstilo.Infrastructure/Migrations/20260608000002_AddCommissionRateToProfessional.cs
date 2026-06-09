using AgendaEstilo.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgendaEstilo.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260608000002_AddCommissionRateToProfessional")]
    public partial class AddCommissionRateToProfessional : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CommissionRate",
                table: "professionals",
                type: "numeric(5,2)",
                nullable: false,
                defaultValue: 0m);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CommissionRate",
                table: "professionals");
        }
    }
}
