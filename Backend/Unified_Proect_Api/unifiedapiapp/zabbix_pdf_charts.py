from reportlab.lib import colors

def draw_line_chart(c, x, y, width, height, data, title):
    if not data or len(data) < 2:
        return

    values = [float(d["value"]) for d in data]
    max_val = max(values) * 1.2  # padding
    min_val = 0

    # Chart border
    c.setStrokeColor(colors.grey)
    c.rect(x, y, width, height)

    # Title
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(x + width / 2, y + height + 10, title)

    # Draw line
    step_x = width / (len(values) - 1)

    prev_x = x
    prev_y = y + (values[0] / max_val) * height

    c.setStrokeColor(colors.blue)
    c.setLineWidth(1.5)

    for i, v in enumerate(values[1:], 1):
        cur_x = x + step_x * i
        cur_y = y + (v / max_val) * height
        c.line(prev_x, prev_y, cur_x, cur_y)
        prev_x, prev_y = cur_x, cur_y
