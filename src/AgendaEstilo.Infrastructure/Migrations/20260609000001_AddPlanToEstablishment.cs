using System;
using AgendaEstilo.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgendaEstilo.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260609000001_AddPlanToEstablishment")]
    public partial class AddPlanToEstablishment : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Plano atual do estabelecimento
            migrationBuilder.AddColumn<string>(
                name: "CurrentPlan",
                table: "Establishments",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            // Data de expiração do plano (null = sem expiração)
            migrationBuilder.AddColumn<DateTime>(
                name: "PlanExpiresAt",
                table: "Establishments",
                type: "timestamp with time zone",
                nullable: true);

            // Índice para queries de plano no admin
            migrationBuilder.CreateIndex(
                name: "IX_Establishments_CurrentPlan",
                table: "Establishments",
                column: "CurrentPlan");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Establishments_CurrentPlan",
                table: "Establishments");

            migrationBuilder.DropColumn(
                name: "CurrentPlan",
                table: "Establishments");

            migrationBuilder.DropColumn(
                name: "PlanExpiresAt",
                table: "Establishments");
        }
    }
}
