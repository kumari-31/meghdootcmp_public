from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from .zabbix_pdf_charts import draw_line_chart

def generate_host_health_pdf(response, summary, cpu, memory, disk):
    c = canvas.Canvas(response, pagesize=A4)
    width, height = A4

    # Header
    c.setFont("Helvetica-Bold", 18)
    c.drawString(50, height - 50, "Host Health Report")

    c.setFont("Helvetica", 12)
    c.drawString(
        50,
        height - 80,
        f"Health Score: {summary['health_score']} ({summary['status']})",
    )

    # Charts
    draw_line_chart(
        c, 50, height - 260, 220, 120,
        list(cpu.values())[0], "CPU Utilization (%)"
    )

    draw_line_chart(
        c, 320, height - 260, 220, 120,
        list(memory.values())[0], "Memory Utilization (%)"
    )

    draw_line_chart(
        c, 50, height - 420, 220, 120,
        list(disk.values())[0], "Disk Utilization (%)"
    )

    # Alerts
    y = height - 470
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Recent Alerts")
    y -= 16

    for a in summary["alerts"]:
        color = colors.red if a["severity"] >= 3 else colors.orange
        c.setFillColor(color)
        c.drawString(60, y, f"- {a['name']}")
        y -= 14

    c.setFillColor(colors.black)
    c.showPage()
    c.save()
