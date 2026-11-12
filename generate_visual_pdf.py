import os

class VisualPDF:
    def __init__(self):
        self.pages = []
        self.current_stream = []
        self.width = 595.28   # A4 width (pt)
        self.height = 841.89  # A4 height (pt)
        self.margin_left = 36
        self.margin_right = 36
        self.margin_top = 40
        self.margin_bottom = 40
        self.usable_width = self.width - self.margin_left - self.margin_right
        self.cursor_y = self.height - self.margin_top

    def new_page(self):
        if self.current_stream:
            self.pages.append("".join(self.current_stream))
            self.current_stream = []
        self.cursor_y = self.height - self.margin_top

    def set_fill_color(self, r, g, b):
        self.current_stream.append(f"{r:.3f} {g:.3f} {b:.3f} rg\n")

    def set_stroke_color(self, r, g, b):
        self.current_stream.append(f"{r:.3f} {g:.3f} {b:.3f} RG\n")

    def rect(self, x, y, w, h, fill=True, stroke=True, line_width=1):
        mode = "B" if (fill and stroke) else ("f" if fill else "S")
        self.current_stream.append(f"{line_width:.2f} w {x:.2f} {y:.2f} {w:.2f} {h:.2f} re {mode}\n")

    def draw_text(self, text, x, y, font="F1", size=9, r=0.1, g=0.15, b=0.2):
        clean_text = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        self.set_fill_color(r, g, b)
        self.current_stream.append(
            f"BT /{font} {size} Tf {x:.2f} {y:.2f} Td ({clean_text}) Tj ET\n"
        )

    def draw_line(self, x1, y1, x2, y2, width=1, r=0.8, g=0.8, b=0.8):
        self.set_stroke_color(r, g, b)
        self.current_stream.append(f"{width:.2f} w {x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S\n")

    def add_page_header(self, title, subtitle):
        self.set_fill_color(0.12, 0.35, 0.8)
        self.rect(self.margin_left, self.cursor_y - 2, self.usable_width, 2.5, fill=True, stroke=False)
        self.draw_text(title, self.margin_left, self.cursor_y + 12, font="F2", size=16, r=0.08, g=0.2, b=0.6)
        self.draw_text(subtitle, self.margin_left, self.cursor_y - 13, font="F1", size=9, r=0.4, g=0.45, b=0.5)
        self.cursor_y -= 26

    def add_security_callout(self):
        box_h = 32
        box_y = self.cursor_y - box_h
        self.set_fill_color(0.96, 0.98, 1.0)
        self.set_stroke_color(0.75, 0.85, 0.98)
        self.rect(self.margin_left, box_y, self.usable_width, box_h, fill=True, stroke=True, line_width=1)
        self.set_fill_color(0.15, 0.45, 0.85)
        self.rect(self.margin_left, box_y, 4, box_h, fill=True, stroke=False)
        
        self.draw_text("SECURITY & ARCHITECTURE NOTE:", self.margin_left + 12, box_y + 19, font="F2", size=8.5, r=0.1, g=0.3, b=0.7)
        self.draw_text("All conversions run 100% inside your local browser memory. Files are NEVER uploaded to any external server.", self.margin_left + 12, box_y + 8, font="F1", size=8.5, r=0.2, g=0.25, b=0.35)
        self.cursor_y -= (box_h + 12)

    def draw_button(self, label, x, y, w, h=15, is_primary=True):
        if is_primary:
            self.set_fill_color(0.14, 0.42, 0.85)
            self.set_stroke_color(0.1, 0.35, 0.75)
            self.rect(x, y, w, h, fill=True, stroke=True, line_width=0.8)
            self.draw_text(label, x + 5, y + 4, font="F2", size=7.5, r=1, g=1, b=1)
        else:
            self.set_fill_color(0.95, 0.97, 0.99)
            self.set_stroke_color(0.78, 0.82, 0.88)
            self.rect(x, y, w, h, fill=True, stroke=True, line_width=0.8)
            self.draw_text(label, x + 5, y + 4, font="F1", size=7.5, r=0.2, g=0.3, b=0.45)

    def draw_badge(self, text, x, y, is_ok=True):
        if is_ok:
            self.set_fill_color(0.92, 0.98, 0.94)
            self.set_stroke_color(0.5, 0.8, 0.6)
            txt_r, txt_g, txt_b = 0.08, 0.5, 0.2
        else:
            self.set_fill_color(0.99, 0.95, 0.95)
            self.set_stroke_color(0.9, 0.6, 0.6)
            txt_r, txt_g, txt_b = 0.7, 0.15, 0.15
        
        bw = len(text) * 5.2 + 10
        self.rect(x, y, bw, 13, fill=True, stroke=True, line_width=0.6)
        self.draw_text(text, x + 5, y + 3.5, font="F2", size=7.5, r=txt_r, g=txt_g, b=txt_b)

    def add_tool_section(self, num, title, filename, purpose, steps, mockup_fn):
        top_y = self.cursor_y
        
        # Tool header badge
        self.set_fill_color(0.14, 0.42, 0.85)
        self.rect(self.margin_left, top_y - 18, 22, 22, fill=True, stroke=False)
        self.draw_text(str(num), self.margin_left + 7, top_y - 13, font="F2", size=11, r=1, g=1, b=1)

        self.draw_text(title, self.margin_left + 28, top_y - 12, font="F2", size=12.5, r=0.08, g=0.15, b=0.25)
        self.draw_text(f"File: site/tools/{filename}", self.margin_left + self.usable_width - 150, top_y - 12, font="F1", size=8, r=0.5, g=0.55, b=0.6)

        self.draw_line(self.margin_left, top_y - 23, self.margin_left + self.usable_width, top_y - 23, width=0.8, r=0.88, g=0.9, b=0.94)

        # Instructions column (Left: 250 pt)
        left_w = 245
        right_w = self.usable_width - left_w - 12
        right_x = self.margin_left + left_w + 12

        curr_y = top_y - 35
        self.draw_text("PURPOSE & USE CASE:", self.margin_left, curr_y, font="F2", size=8, r=0.2, g=0.4, b=0.7)
        curr_y -= 11
        self.draw_text(purpose, self.margin_left + 4, curr_y, font="F1", size=8.2, r=0.25, g=0.3, b=0.35)
        curr_y -= 15

        self.draw_text("STEP-BY-STEP WORKFLOW:", self.margin_left, curr_y, font="F2", size=8, r=0.2, g=0.4, b=0.7)
        curr_y -= 12

        for i, st in enumerate(steps, 1):
            self.draw_text(f"{i}.", self.margin_left + 4, curr_y, font="F2", size=8, r=0.15, g=0.45, b=0.85)
            self.draw_text(st, self.margin_left + 16, curr_y, font="F1", size=8, r=0.2, g=0.25, b=0.3)
            curr_y -= 13

        # Visual UI Mockup Box on Right Side
        mockup_h = 135
        mockup_y = top_y - 27 - mockup_h
        
        # Outer UI Card Container
        self.set_fill_color(0.985, 0.99, 1.0)
        self.set_stroke_color(0.8, 0.85, 0.92)
        self.rect(right_x, mockup_y, right_w, mockup_h, fill=True, stroke=True, line_width=1)
        
        # Mockup Title Bar (Browser style)
        self.set_fill_color(0.92, 0.94, 0.97)
        self.rect(right_x, mockup_y + mockup_h - 18, right_w, 18, fill=True, stroke=True, line_width=0.8)
        # Window controls dots
        self.set_fill_color(0.9, 0.4, 0.4)
        self.rect(right_x + 6, mockup_y + mockup_h - 13, 6, 6, fill=True, stroke=False)
        self.set_fill_color(0.9, 0.7, 0.3)
        self.rect(right_x + 15, mockup_y + mockup_h - 13, 6, 6, fill=True, stroke=False)
        self.set_fill_color(0.4, 0.8, 0.4)
        self.rect(right_x + 24, mockup_y + mockup_h - 13, 6, 6, fill=True, stroke=False)
        
        self.draw_text(f"UI Screen & Input/Output Example: {title}", right_x + 36, mockup_y + mockup_h - 13, font="F2", size=7.5, r=0.3, g=0.35, b=0.45)

        # Call specific mockup drawing function
        mockup_fn(self, right_x + 6, mockup_y + 6, right_w - 12, mockup_h - 28)

        # Advance cursor for next tool
        section_h = max(top_y - curr_y, mockup_h + 30)
        self.cursor_y = top_y - section_h - 16

    def build(self, filename):
        if self.current_stream:
            self.pages.append("".join(self.current_stream))

        num_pages = len(self.pages)
        objects = []
        
        # Footers
        for i in range(num_pages):
            footer_stream = []
            f_y = 22
            footer_stream.append(f"0.8 0.8 0.8 RG\n0.5 w {self.margin_left:.2f} {f_y + 11:.2f} m {self.margin_left + self.usable_width:.2f} {f_y + 11:.2f} l S\n")
            clean_l = "MTF / CDR Toolkit - Visual Illustrated User Manual (English)"
            clean_r = f"Page {i+1} of {num_pages}"
            footer_stream.append(f"BT /F1 7.5 Tf 0.5 0.55 0.6 rg {self.margin_left:.2f} {f_y:.2f} Td ({clean_l}) Tj ET\n")
            footer_stream.append(f"BT /F1 7.5 Tf 0.5 0.55 0.6 rg {self.margin_left + self.usable_width - 48:.2f} {f_y:.2f} Td ({clean_r}) Tj ET\n")
            self.pages[i] = self.pages[i] + "".join(footer_stream)

        page_obj_ids = [5 + 2*i for i in range(num_pages)]

        objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
        kids_str = " ".join(f"{pid} 0 R" for pid in page_obj_ids)
        objects.append(f"<< /Type /Pages /Kids [{kids_str}] /Count {num_pages} >>".encode('utf-8'))
        objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
        objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")

        for i, p_str in enumerate(self.pages):
            p_data = p_str.encode('latin1')
            stream_id = 6 + 2*i
            p_obj = f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {self.width:.2f} {self.height:.2f}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {stream_id} 0 R >>".encode('utf-8')
            objects.append(p_obj)
            s_obj = f"<< /Length {len(p_data)} >>\nstream\n".encode('utf-8') + p_data + b"\nendstream"
            objects.append(s_obj)

        out = bytearray()
        out.extend(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        xref = []
        for i, obj in enumerate(objects):
            xref.append(len(out))
            out.extend(f"{i+1} 0 obj\n".encode('utf-8'))
            out.extend(obj)
            out.extend(b"\nendobj\n")

        startxref = len(out)
        out.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode('utf-8'))
        for offset in xref:
            out.extend(f"{offset:010d} 00000 n \n".encode('utf-8'))
        out.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{startxref}\n%%EOF\n".encode('utf-8'))

        with open(filename, 'wb') as f:
            f.write(out)
        print(f"Generated visual PDF: {filename} ({len(out)} bytes, {num_pages} pages)")


# ==============================================================================
# UI MOCKUP RENDER FUNCTIONS FOR EACH TOOL
# ==============================================================================

def mockup_tool1(pdf, x, y, w, h):
    # Step 1: Upload Box
    pdf.set_fill_color(1, 1, 1)
    pdf.set_stroke_color(0.8, 0.85, 0.9)
    pdf.rect(x, y + h - 22, w, 22, fill=True, stroke=True, line_width=0.7)
    pdf.draw_text("[+] Choose File: cdr_sample_04nov.csv", x + 6, y + h - 14, font="F1", size=7.5, r=0.2, g=0.4, b=0.7)
    pdf.draw_badge("Filtered: 1,420 rows", x + w - 85, y + h - 18, is_ok=True)

    # Step 2: Textarea Mockup
    pdf.set_fill_color(0.97, 0.98, 0.99)
    pdf.set_stroke_color(0.82, 0.85, 0.9)
    pdf.rect(x, y + 36, w, 44, fill=True, stroke=True, line_width=0.7)
    pdf.draw_text("Dropped During Conversation", x + 5, y + 68, font="F2", size=7, r=0.1, g=0.2, b=0.5)
    pdf.draw_text("lead_id: 211296", x + 12, y + 58, font="F1", size=6.8, r=0.3, g=0.35, b=0.4)
    pdf.draw_text("lead_id: 211666", x + 12, y + 48, font="F1", size=6.8, r=0.3, g=0.35, b=0.4)
    pdf.draw_text("Connected to an executive  -> lead_id: 193132", x + 5, y + 38, font="F1", size=6.8, r=0.2, g=0.4, b=0.3)

    # Step 3: Action Buttons & Download
    pdf.draw_button("Download Interested", x, y + 16, 75, 14, is_primary=True)
    pdf.draw_button("Connected Only", x + 80, y + 16, 68, 14, is_primary=False)
    pdf.draw_button("Both Files", x + 152, y + 16, 52, 14, is_primary=False)
    
    # Live result alert
    pdf.set_fill_color(0.93, 0.98, 0.94)
    pdf.rect(x, y, w, 12, fill=True, stroke=False)
    pdf.draw_text("Output: 04_Nov_MTF_Interested.xlsx downloaded (142 rows)", x + 4, y + 3, font="F2", size=6.8, r=0.1, g=0.55, b=0.2)


def mockup_tool2(pdf, x, y, w, h):
    # Left Input Preview
    half_w = (w - 10) / 2
    pdf.set_fill_color(1, 1, 1)
    pdf.set_stroke_color(0.8, 0.85, 0.9)
    pdf.rect(x, y + 20, half_w, h - 22, fill=True, stroke=True, line_width=0.7)
    
    # Mini table header
    pdf.set_fill_color(0.92, 0.95, 0.98)
    pdf.rect(x, y + h - 14, half_w, 12, fill=True, stroke=False)
    pdf.draw_text("Excel Input (Raw Columns)", x + 4, y + h - 10, font="F2", size=7, r=0.15, g=0.3, b=0.6)
    
    pdf.draw_text("lead_id: 193868", x + 4, y + h - 25, font="F1", size=6.8, r=0.2, g=0.25, b=0.3)
    pdf.draw_text("call_id: 09068437790-1793...", x + 4, y + h - 36, font="F1", size=6.8, r=0.2, g=0.25, b=0.3)
    pdf.draw_text("sub_disp: Interested", x + 4, y + h - 47, font="F1", size=6.8, r=0.2, g=0.25, b=0.3)
    pdf.draw_text("summary: Call completed", x + 4, y + h - 58, font="F1", size=6.8, r=0.2, g=0.25, b=0.3)
    pdf.draw_badge("Auto-mapped", x + 4, y + 24, is_ok=True)

    # Right JSON Output Preview
    rx = x + half_w + 10
    pdf.set_fill_color(0.98, 0.98, 0.99)
    pdf.set_stroke_color(0.82, 0.85, 0.9)
    pdf.rect(rx, y + 20, half_w, h - 22, fill=True, stroke=True, line_width=0.7)
    
    pdf.set_fill_color(0.2, 0.25, 0.3)
    pdf.rect(rx, y + h - 14, half_w, 12, fill=True, stroke=False)
    pdf.draw_text("Output JSON Array Preview", rx + 4, y + h - 10, font="F2", size=7, r=1, g=1, b=1)

    pdf.draw_text("[", rx + 4, y + h - 24, font="F1", size=7, r=0.4, g=0.4, b=0.4)
    pdf.draw_text('  { "lead_id": 193868,', rx + 4, y + h - 34, font="F1", size=6.8, r=0.1, g=0.4, b=0.7)
    pdf.draw_text('    "call_id": "0906843...",', rx + 4, y + h - 44, font="F1", size=6.8, r=0.7, g=0.3, b=0.1)
    pdf.draw_text('    "disposition": "Contacted",', rx + 4, y + h - 54, font="F1", size=6.8, r=0.1, g=0.5, b=0.3)
    pdf.draw_text('    "sub_disposition": "..." }', rx + 4, y + h - 64, font="F1", size=6.8, r=0.3, g=0.3, b=0.3)
    pdf.draw_text("]", rx + 4, y + 24, font="F1", size=7, r=0.4, g=0.4, b=0.4)

    # Bottom Actions
    pdf.draw_button("Copy JSON", x, y, 65, 14, is_primary=True)
    pdf.draw_button("Download .json", x + 72, y, 75, 14, is_primary=False)
    pdf.draw_text("Status: 1,420 records converted (0 duplicates)", x + 155, y + 4, font="F2", size=6.8, r=0.1, g=0.5, b=0.2)


def mockup_tool3(pdf, x, y, w, h):
    # Top URL bar
    pdf.set_fill_color(1, 1, 1)
    pdf.set_stroke_color(0.8, 0.85, 0.9)
    pdf.rect(x, y + h - 20, w - 55, 18, fill=True, stroke=True, line_width=0.7)
    pdf.draw_text("POST", x + 4, y + h - 13, font="F2", size=7.5, r=0.8, g=0.3, b=0.1)
    pdf.draw_text("https://crm.company.com/api/v1/update-leads", x + 32, y + h - 13, font="F1", size=7.2, r=0.2, g=0.25, b=0.3)
    pdf.draw_button("Send", x + w - 50, y + h - 20, 50, 18, is_primary=True)

    # Auth Bar
    pdf.set_fill_color(0.96, 0.97, 0.99)
    pdf.rect(x, y + h - 42, w, 18, fill=True, stroke=True, line_width=0.7)
    pdf.draw_text("Authorization: Bearer Token [ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... ]", x + 4, y + h - 35, font="F1", size=7, r=0.3, g=0.35, b=0.45)

    # Body Preview / Integration
    pdf.set_fill_color(1, 1, 1)
    pdf.rect(x, y + 22, w, 32, fill=True, stroke=True, line_width=0.7)
    pdf.draw_text("Body: Loaded from Converter (Tool #2) -> 1,420 records payload", x + 4, y + 44, font="F2", size=7, r=0.15, g=0.45, b=0.8)
    pdf.draw_button("Use JSON from converter", x + 4, y + 26, 110, 13, is_primary=False)

    # Live Response Box
    pdf.set_fill_color(0.94, 0.98, 0.95)
    pdf.set_stroke_color(0.6, 0.8, 0.65)
    pdf.rect(x, y, w, 18, fill=True, stroke=True, line_width=0.8)
    pdf.draw_badge("200 OK", x + 4, y + 2.5, is_ok=True)
    pdf.draw_text("Latency: 142 ms  |  Size: 4,820 bytes  |  Result: { success: true, updated: 1420 }", x + 50, y + 6, font="F2", size=6.8, r=0.1, g=0.5, b=0.2)


def mockup_tool4(pdf, x, y, w, h):
    # Filter Controls Box
    pdf.set_fill_color(1, 1, 1)
    pdf.set_stroke_color(0.8, 0.85, 0.9)
    pdf.rect(x, y + 54, w, h - 56, fill=True, stroke=True, line_width=0.7)

    pdf.draw_text("CAMPAIGN FILTER:", x + 6, y + h - 14, font="F2", size=7, r=0.3, g=0.35, b=0.4)
    pdf.set_fill_color(0.95, 0.97, 1.0)
    pdf.rect(x + 6, y + h - 28, 95, 12, fill=True, stroke=True, line_width=0.6)
    pdf.draw_text("MTF-CROSS SELL", x + 10, y + h - 24, font="F1", size=7, r=0.1, g=0.2, b=0.4)

    pdf.draw_text("GATEWAY DISP:", x + 112, y + h - 14, font="F2", size=7, r=0.3, g=0.35, b=0.4)
    pdf.set_fill_color(0.95, 0.97, 1.0)
    pdf.rect(x + 112, y + h - 28, 85, 12, fill=True, stroke=True, line_width=0.6)
    pdf.draw_text("ANSWER", x + 116, y + h - 24, font="F1", size=7, r=0.1, g=0.2, b=0.4)

    pdf.draw_text("CRM DISPOSITION:  (o) Keep null rows only  |  ( ) Clear column", x + 6, y + 58, font="F1", size=7, r=0.2, g=0.3, b=0.4)

    # Stage Filter Chips / Pipeline
    pdf.draw_text("LIVE FILTER FUNNEL / CHIPS:", x, y + 40, font="F2", size=7.2, r=0.2, g=0.4, b=0.7)
    
    chip_w = (w - 18) / 4
    chips = [("Total Rows", "18,420"), ("Campaign", "12,100"), ("Gateway", "4,320"), ("Final Null", "840")]
    for i, (l, v) in enumerate(chips):
        cx = x + i * (chip_w + 6)
        is_last = (i == 3)
        pdf.set_fill_color(0.14, 0.42, 0.85) if is_last else pdf.set_fill_color(0.93, 0.95, 0.98)
        pdf.set_stroke_color(0.1, 0.35, 0.75) if is_last else pdf.set_stroke_color(0.8, 0.85, 0.9)
        pdf.rect(cx, y + 18, chip_w, 20, fill=True, stroke=True, line_width=0.6)
        txt_col = (1, 1, 1) if is_last else (0.4, 0.45, 0.5)
        val_col = (1, 1, 1) if is_last else (0.1, 0.15, 0.2)
        pdf.draw_text(l, cx + 4, y + 30, font="F1", size=6, r=txt_col[0], g=txt_col[1], b=txt_col[2])
        pdf.draw_text(v, cx + 4, y + 21, font="F2", size=7.5, r=val_col[0], g=val_col[1], b=val_col[2])

    # Download Button
    pdf.draw_button("Convert & Download XLSX (840 rows)", x, y, 140, 15, is_primary=True)
    pdf.draw_text("Output: sample_filtered.xlsx ready", x + 148, y + 4, font="F2", size=6.8, r=0.1, g=0.5, b=0.2)


def mockup_tool5(pdf, x, y, w, h):
    # Top File Input
    pdf.set_fill_color(1, 1, 1)
    pdf.set_stroke_color(0.8, 0.85, 0.9)
    pdf.rect(x, y + h - 22, w, 22, fill=True, stroke=True, line_width=0.7)
    pdf.draw_text("[+] Upload Lead Data: lead_export_04nov.xlsx", x + 6, y + h - 14, font="F1", size=7.5, r=0.2, g=0.4, b=0.7)
    pdf.draw_badge("Ready: 840 leads", x + w - 80, y + h - 18, is_ok=True)

    # Date Picker
    pdf.set_fill_color(0.97, 0.98, 0.99)
    pdf.rect(x, y + h - 42, w, 16, fill=True, stroke=True, line_width=0.6)
    pdf.draw_text("date_entered: [ 2026-11-04  14:30 ] (Auto-formats Excel 1900 date serial number)", x + 6, y + h - 35, font="F1", size=7, r=0.2, g=0.25, b=0.3)

    # 57-Column Schema Preview
    pdf.set_fill_color(1, 1, 1)
    pdf.rect(x, y + 20, w, 44, fill=True, stroke=True, line_width=0.7)
    
    # Table header
    pdf.set_fill_color(0.92, 0.94, 0.97)
    pdf.rect(x, y + 52, w, 12, fill=True, stroke=False)
    pdf.draw_text("CRM 57-COLUMN EXPORT SCHEMA PREVIEW", x + 4, y + 56, font="F2", size=6.8, r=0.2, g=0.3, b=0.5)

    pdf.draw_text("id | full_name | parent_id | sub_disposition | call_id | date_entered | status ...", x + 4, y + 42, font="F2", size=6.5, r=0.3, g=0.35, b=0.45)
    pdf.draw_text("1  | Rahul S.  | 193868    | Dropped Conv    | 0906... | 04/11/2026   | Held   ...", x + 4, y + 32, font="F1", size=6.5, r=0.1, g=0.2, b=0.3)
    pdf.draw_text("2  | Sneha P.  | 193874    | Connected Exec  | 0984... | 04/11/2026   | Held   ...", x + 4, y + 22, font="F1", size=6.5, r=0.1, g=0.2, b=0.3)

    # Download Button
    pdf.draw_button("Convert & Download CRM Sheet", x, y, 130, 15, is_primary=True)
    pdf.draw_text("Generated: 04_Nov_MTF_ANSWER_NULL.xlsx", x + 138, y + 4, font="F2", size=6.8, r=0.1, g=0.5, b=0.2)


def mockup_tool6(pdf, x, y, w, h):
    # Left Pivot Table
    half_w = (w - 10) / 2
    pdf.set_fill_color(1, 1, 1)
    pdf.set_stroke_color(0.8, 0.85, 0.9)
    pdf.rect(x, y + 20, half_w, h - 22, fill=True, stroke=True, line_width=0.7)
    
    # Header
    pdf.set_fill_color(0.87, 0.92, 0.97) # Light blue header #DDEBF7
    pdf.rect(x, y + h - 14, half_w, 12, fill=True, stroke=False)
    pdf.draw_text("CRM Sub-Disposition", x + 4, y + h - 10, font="F2", size=6.8, r=0.1, g=0.2, b=0.4)
    pdf.draw_text("Count", x + half_w - 24, y + h - 10, font="F2", size=6.8, r=0.1, g=0.2, b=0.4)

    rows = [("Interested", "1,240"), ("Dropped During Conv", "480"), ("Connected to executive", "320")]
    cy = y + h - 24
    for r_k, r_v in rows:
        pdf.draw_text(r_k, x + 4, cy, font="F1", size=6.5, r=0.2, g=0.25, b=0.3)
        pdf.draw_text(r_v, x + half_w - 24, cy, font="F1", size=6.5, r=0.1, g=0.2, b=0.4)
        cy -= 11

    # Grand Total
    pdf.set_fill_color(0.87, 0.92, 0.97)
    pdf.rect(x, y + 20, half_w, 11, fill=True, stroke=False)
    pdf.draw_text("Grand Total", x + 4, y + 23, font="F2", size=6.8, r=0.1, g=0.2, b=0.4)
    pdf.draw_text("2,040", x + half_w - 24, y + 23, font="F2", size=6.8, r=0.2, g=0.4, b=0.8)

    # Right Connectivity Summary
    rx = x + half_w + 10
    pdf.set_fill_color(1, 1, 1)
    pdf.set_stroke_color(0.8, 0.85, 0.9)
    pdf.rect(rx, y + 20, half_w, h - 22, fill=True, stroke=True, line_width=0.7)

    pdf.set_fill_color(0.87, 0.92, 0.97)
    pdf.rect(rx, y + h - 14, half_w, 12, fill=True, stroke=False)
    pdf.draw_text("Call Performance Metrics", rx + 4, y + h - 10, font="F2", size=6.8, r=0.1, g=0.2, b=0.4)
    pdf.draw_text("Value", rx + half_w - 24, y + h - 10, font="F2", size=6.8, r=0.1, g=0.2, b=0.4)

    s_rows = [("ANSWER_NULL Calls", "840"), ("Connected Calls", "2,040"), ("Total Dialed Calls", "15,000")]
    cy = y + h - 24
    for s_k, s_v in s_rows:
        pdf.draw_text(s_k, rx + 4, cy, font="F1", size=6.5, r=0.2, g=0.25, b=0.3)
        pdf.draw_text(s_v, rx + half_w - 24, cy, font="F1", size=6.5, r=0.1, g=0.2, b=0.4)
        cy -= 11

    # Connectivity row
    pdf.set_fill_color(0.87, 0.92, 0.97)
    pdf.rect(rx, y + 20, half_w, 11, fill=True, stroke=False)
    pdf.draw_text("Connectivity %", rx + 4, y + 23, font="F2", size=6.8, r=0.1, g=0.2, b=0.4)
    pdf.draw_text("13.60%", rx + half_w - 28, y + 23, font="F2", size=6.8, r=0.1, g=0.55, b=0.2)

    # Bottom Buttons
    pdf.draw_button("Copy Screenshot (WhatsApp Ctrl+V)", x, y, 135, 14, is_primary=True)
    pdf.draw_button("Download PNG", x + 140, y, 65, 14, is_primary=False)
    pdf.draw_button("Download Excel", x + 210, y, 65, 14, is_primary=False)


# ==============================================================================
# MAIN PDF GENERATION BUILD
# ==============================================================================

pdf = VisualPDF()

# ----------------- PAGE 1: Tools 1 & 2 -----------------
pdf.add_page_header(
    "MTF CDR Toolkit - Illustrated User Manual",
    "Visual Operating Guide with UI Mockups & Step-by-Step Examples (Tools 1 & 2)"
)
pdf.add_security_callout()

pdf.add_tool_section(
    num=1,
    title="Disposition Remark Converter",
    filename="1-disposition-remark.html",
    purpose="Filter raw CDR CSV for MTF-CROSS SELL campaign, attach manual remarks to Interested leads, and export segmented Excel spreadsheets.",
    steps=[
        "Upload File: Click 'Upload the CDR CSV file'. Campaign & disposition are auto-filtered.",
        "Paste Remarks: Paste Remark title with 'lead_id: 12345' lines below it.",
        "Select Date: Choose campaign date for dynamic filename.",
        "Download: Click 'Interested only', 'Connected only', or 'Both'."
    ],
    mockup_fn=mockup_tool1
)

pdf.add_tool_section(
    num=2,
    title="Excel to JSON Converter",
    filename="2-excel-to-json.html",
    purpose="Convert raw calling spreadsheets (.xlsx, .xlsm, or .csv) into clean, deduplicated CRM API JSON arrays for bulk API updates.",
    steps=[
        "Drop File: Drag and drop your Excel or CSV file into the drop zone.",
        "Verify Mapping: Tool auto-detects lead_id, call_id, disposition, and remarks.",
        "Deduplication: Duplicate call_id rows and blank lines are auto-purged.",
        "Export: Click 'Copy JSON' to clipboard or 'Download .json' file."
    ],
    mockup_fn=mockup_tool2
)

# ----------------- PAGE 2: Tools 3 & 4 -----------------
pdf.new_page()
pdf.add_page_header(
    "MTF CDR Toolkit - Illustrated User Manual (Page 2)",
    "Visual Operating Guide with UI Mockups & Step-by-Step Examples (Tools 3 & 4)"
)

pdf.add_tool_section(
    num=3,
    title="API Request Sender",
    filename="3-api-sender.html",
    purpose="Directly dispatch JSON payloads (generated in Tool #2) to your target CRM or dialer API without needing Postman.",
    steps=[
        "Configure Endpoint: Select HTTP method (POST) and enter destination API URL.",
        "Authorization: Select scheme (Bearer Token / Basic Auth / API Key header).",
        "Load JSON: Click 'Use JSON from converter' to auto-import Tool 2 data.",
        "Execute: Click 'Send' to view live response status code and latency."
    ],
    mockup_fn=mockup_tool3
)

pdf.add_tool_section(
    num=4,
    title="Download Answer Null CDR",
    filename="4-answer-null-cdr.html",
    purpose="Identify and extract calls answered at the gateway telephony level but left un-dispositioned (Null) in CRM.",
    steps=[
        "Upload CDR: Drop your raw dialer CDR CSV file into the drop zone.",
        "Verify Filters: Campaign='MTF-CROSS SELL', Gateway='ANSWER', CRM='null'.",
        "Pipeline View: Track live count chips (Total -> Campaign -> Final Null).",
        "Download XLSX: Click 'Convert & Download XLSX' for filtered sheet."
    ],
    mockup_fn=mockup_tool4
)

# ----------------- PAGE 3: Tools 5 & 6 -----------------
pdf.new_page()
pdf.add_page_header(
    "MTF CDR Toolkit - Illustrated User Manual (Page 3)",
    "Visual Operating Guide with UI Mockups & Step-by-Step Examples (Tools 5 & 6)"
)

pdf.add_tool_section(
    num=5,
    title="Answer Null Lead Data",
    filename="5-lead-to-answer-null.html",
    purpose="Transform filtered Answer Null records into the standard 57-column CRM import spreadsheet template for re-allocation.",
    steps=[
        "Upload Lead Data: Drop your Lead Data spreadsheet (.xlsx) into upload zone.",
        "Set Date & Time: Pick campaign batch timestamp via 'date_entered' picker.",
        "Auto-Format: Tool automatically calculates Excel 1900 date serial numbers.",
        "Download: Click 'Convert & Download' to save [Date]_MTF_ANSWER_NULL.xlsx."
    ],
    mockup_fn=mockup_tool5
)

pdf.add_tool_section(
    num=6,
    title="Sub-Disposition Pivot Converter",
    filename="6-sub-disposition-pivot.html",
    purpose="Generate live Sub-Disposition pivot tables, compute Call Connectivity %, and export 2x retina PNG graphics for WhatsApp/Email.",
    steps=[
        "Upload File: Drop your CDR CSV or Excel file into the upload zone.",
        "Instant Analysis: Review Pivot table counts and Call Connectivity %.",
        "One-Click Share: Click 'Copy screenshot' to paste directly in WhatsApp (Ctrl+V).",
        "Spreadsheet Download: Click 'Download Excel' or 'Download CSV'."
    ],
    mockup_fn=mockup_tool6
)

# ----------------- PAGE 4: Workflow & QA Reference -----------------
pdf.new_page()
pdf.add_page_header(
    "MTF CDR Toolkit - Operations Reference & QA Guide",
    "Complete End-to-End Workflow Diagram & QA Troubleshooting Matrix"
)

# End-to-End Architecture Workflow Box
wf_y = pdf.cursor_y - 120
pdf.set_fill_color(0.98, 0.99, 1.0)
pdf.set_stroke_color(0.8, 0.85, 0.92)
pdf.rect(pdf.margin_left, wf_y, pdf.usable_width, 120, fill=True, stroke=True, line_width=1)

pdf.set_fill_color(0.12, 0.35, 0.8)
pdf.rect(pdf.margin_left, wf_y + 104, pdf.usable_width, 16, fill=True, stroke=False)
pdf.draw_text("END-TO-END DATA WORKFLOW PIPELINE", pdf.margin_left + 8, wf_y + 108, font="F2", size=8.5, r=1, g=1, b=1)

# Flow steps
pipeline_steps = [
    ("1. Raw Dialer CSV", "Raw export from dialer containing all call legs"),
    ("2. Tool #4 (Answer Null)", "Isolate answered calls with missing CRM status"),
    ("3. Tool #5 (Lead Formatter)", "Map to 57-column CRM re-upload template"),
    ("4. Tool #1 (Remark Adder)", "Add QA/Agent remarks to Interested leads"),
    ("5. Tool #2 -> Tool #3", "Convert to JSON payload and POST to CRM API"),
    ("6. Tool #6 (Pivot & Stats)", "Generate Connectivity % and WhatsApp report card")
]

py = wf_y + 88
for p_title, p_desc in pipeline_steps:
    pdf.draw_text(p_title, pdf.margin_left + 12, py, font="F2", size=7.8, r=0.1, g=0.3, b=0.7)
    pdf.draw_text(f"-> {p_desc}", pdf.margin_left + 140, py, font="F1", size=7.5, r=0.25, g=0.3, b=0.35)
    py -= 14

pdf.cursor_y = wf_y - 18

# QA Troubleshooting Table
pdf.draw_text("QA CHECKLIST & TROUBLESHOOTING MATRIX:", pdf.margin_left, pdf.cursor_y, font="F2", size=9, r=0.1, g=0.2, b=0.5)
pdf.cursor_y -= 12

tbl_h = 135
tbl_y = pdf.cursor_y - tbl_h
pdf.set_fill_color(1, 1, 1)
pdf.set_stroke_color(0.8, 0.85, 0.9)
pdf.rect(pdf.margin_left, tbl_y, pdf.usable_width, tbl_h, fill=True, stroke=True, line_width=0.8)

# Header
pdf.set_fill_color(0.92, 0.94, 0.98)
pdf.rect(pdf.margin_left, tbl_y + tbl_h - 18, pdf.usable_width, 18, fill=True, stroke=False)
pdf.draw_text("Observed Issue", pdf.margin_left + 8, tbl_y + tbl_h - 13, font="F2", size=8, r=0.1, g=0.2, b=0.4)
pdf.draw_text("Root Cause", pdf.margin_left + 160, tbl_y + tbl_h - 13, font="F2", size=8, r=0.1, g=0.2, b=0.4)
pdf.draw_text("Recommended Action", pdf.margin_left + 330, tbl_y + tbl_h - 13, font="F2", size=8, r=0.1, g=0.2, b=0.4)

qa_rows = [
    ("Columns not found error", "File header names differ from expected names", "Verify CAMPAIGN NAME, CRM SUB-DISPOSITION, RECORD ID"),
    ("No rows matched filter", "Campaign name spelling or case mismatch", "Ensure campaign is exact match to MTF-CROSS SELL"),
    ("Extra IDs warned in Tool #1", "Pasted Lead IDs do not belong to filtered set", "Double-check if lead IDs belong to the same campaign date"),
    ("JSON shows empty sub_disp", "Checkbox 'Include empty sub_disposition' off", "Check the box in Tool #2 if null remarks are required"),
    ("API Error 400 (Private IP)", "Endpoint URL points to localhost or private IP", "Use public HTTPS domain; SSRF protection blocks local IPs"),
    ("Screenshot Ctrl+V not working", "Browser permission denied for clipboard write", "Click 'Download screenshot (PNG)' button to save directly")
]

qy = tbl_y + tbl_h - 32
for iss, cause, act in qa_rows:
    pdf.draw_text(iss, pdf.margin_left + 8, qy, font="F2", size=7.2, r=0.7, g=0.15, b=0.15)
    pdf.draw_text(cause, pdf.margin_left + 160, qy, font="F1", size=7.2, r=0.25, g=0.3, b=0.35)
    pdf.draw_text(act, pdf.margin_left + 330, qy, font="F1", size=7.2, r=0.1, g=0.45, b=0.2)
    pdf.draw_line(pdf.margin_left, qy - 4, pdf.margin_left + pdf.usable_width, qy - 4, width=0.4, r=0.9, g=0.92, b=0.95)
    qy -= 18

pdf.build("D:\\Wannee-Ai\\Converter\\MTF-Toolkit\\CDR_Toolkit_User_Manual.pdf")

