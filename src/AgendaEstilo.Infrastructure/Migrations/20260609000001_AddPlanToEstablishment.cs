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
                table: "establishments",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            // Data de expiração do plano (null = sem expiração)
            migrationBuilder.AddColumn<DateTime>(
                name: "PlanExpiresAt",
                table: "establishments",
                type: "timestamp with time zone",
                nullable: true);

            // Índice para queries de plano no admin
            migrationBuilder.CreateIndex(
                name: "IX_establishments_CurrentPlan",
                table: "establishments",
                column: "CurrentPlan");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_establishments_CurrentPlan",
                table: "establishments");

            migrationBuilder.DropColumn(
                name: "CurrentPlan",
                table: "establishments");

            migrationBuilder.DropColumn(
                name: "PlanExpiresAt",
                table: "establishments");
        }
    }
}
