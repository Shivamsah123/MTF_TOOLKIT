import sys

class SimplePDF:
    def __init__(self):
        self.pages = []
        self.current_stream = []
        self.width = 595.28  # A4 width in pt
        self.height = 841.89 # A4 height in pt
        self.margin_left = 40
        self.margin_right = 40
        self.margin_top = 45
        self.margin_bottom = 45
        self.usable_width = self.width - self.margin_left - self.margin_right
        self.cursor_y = self.height - self.margin_top

    def new_page(self):
        if self.current_stream:
            self.pages.append("".join(self.current_stream))
            self.current_stream = []
        self.cursor_y = self.height - self.margin_top

    def check_space(self, needed_pt):
        if self.cursor_y - needed_pt < self.margin_bottom:
            self.new_page()

    def set_fill_color(self, r, g, b):
        self.current_stream.append(f"{r:.3f} {g:.3f} {b:.3f} rg\n")

    def set_stroke_color(self, r, g, b):
        self.current_stream.append(f"{r:.3f} {g:.3f} {b:.3f} RG\n")

    def rect(self, x, y, w, h, fill=True, stroke=True):
        mode = "B" if (fill and stroke) else ("f" if fill else "S")
        self.current_stream.append(f"{x:.2f} {y:.2f} {w:.2f} {h:.2f} re {mode}\n")

    def draw_text(self, text, x, y, font="F1", size=10, r=0.1, g=0.15, b=0.2):
        clean_text = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        self.set_fill_color(r, g, b)
        self.current_stream.append(
            f"BT /{font} {size} Tf {x:.2f} {y:.2f} Td ({clean_text}) Tj ET\n"
        )

    def draw_line(self, x1, y1, x2, y2, width=1, r=0.8, g=0.8, b=0.8):
        self.set_stroke_color(r, g, b)
        self.current_stream.append(f"{width} w {x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S\n")

    def add_header(self, title, subtitle):
        self.set_fill_color(0.12, 0.35, 0.8)
        self.rect(self.margin_left, self.cursor_y - 2, self.usable_width, 3, fill=True, stroke=False)
        self.draw_text(title, self.margin_left, self.cursor_y + 12, font="F2", size=17, r=0.08, g=0.2, b=0.6)
        self.draw_text(subtitle, self.margin_left, self.cursor_y - 14, font="F1", size=9.5, r=0.4, g=0.45, b=0.5)
        self.cursor_y -= 30

    def add_callout(self, text):
        self.check_space(45)
        box_y = self.cursor_y - 35
        self.set_fill_color(0.96, 0.97, 0.99)
        self.set_stroke_color(0.85, 0.88, 0.92)
        self.rect(self.margin_left, box_y, self.usable_width, 35, fill=True, stroke=True)
        self.set_fill_color(0.15, 0.45, 0.85)
        self.rect(self.margin_left, box_y, 4, 35, fill=True, stroke=False)
        lines = text.split("\n")
        curr_y = box_y + 20
        for l in lines:
            self.draw_text(l, self.margin_left + 14, curr_y, font="F1", size=8.5, r=0.2, g=0.25, b=0.3)
            curr_y -= 12
        self.cursor_y -= 45

    def add_tool_card(self, num, title, subtitle, purpose, steps, tip=""):
        est_height = 40 + len(steps) * 16 + (30 if tip else 0) + 30
        self.check_space(est_height)

        card_top = self.cursor_y
        
        # Tool header badge
        self.set_fill_color(0.14, 0.42, 0.85)
        self.rect(self.margin_left, card_top - 18, 22, 22, fill=True, stroke=False)
        self.draw_text(str(num), self.margin_left + 7, card_top - 13, font="F2", size=11, r=1, g=1, b=1)

        self.draw_text(title, self.margin_left + 30, card_top - 12, font="F2", size=13, r=0.08, g=0.15, b=0.25)
        self.draw_text(f"[{subtitle}]", self.margin_left + 30 + len(title)*7.2, card_top - 12, font="F1", size=8.5, r=0.45, g=0.5, b=0.55)

        self.draw_line(self.margin_left, card_top - 24, self.margin_left + self.usable_width, card_top - 24, width=0.8, r=0.88, g=0.9, b=0.94)

        self.cursor_y = card_top - 38
        self.draw_text("PURPOSE & BUSINESS GOAL:", self.margin_left, self.cursor_y, font="F2", size=8.5, r=0.2, g=0.4, b=0.7)
        self.cursor_y -= 13
        self.draw_text(purpose, self.margin_left + 8, self.cursor_y, font="F1", size=8.8, r=0.25, g=0.3, b=0.35)
        self.cursor_y -= 16

        self.draw_text("STEP-BY-STEP USAGE INSTRUCTIONS:", self.margin_left, self.cursor_y, font="F2", size=8.5, r=0.2, g=0.4, b=0.7)
        self.cursor_y -= 13

        for i, st in enumerate(steps, 1):
            self.draw_text(f"{i}.", self.margin_left + 10, self.cursor_y, font="F2", size=8.5, r=0.15, g=0.45, b=0.85)
            self.draw_text(st, self.margin_left + 24, self.cursor_y, font="F1", size=8.5, r=0.2, g=0.25, b=0.3)
            self.cursor_y -= 14

        if tip:
            self.cursor_y -= 2
            self.set_fill_color(0.99, 0.98, 0.92)
            self.set_stroke_color(0.9, 0.8, 0.5)
            self.rect(self.margin_left + 8, self.cursor_y - 12, self.usable_width - 16, 20, fill=True, stroke=True)
            self.draw_text(f"PRO TIP / VERIFICATION: {tip}", self.margin_left + 16, self.cursor_y - 6, font="F1", size=8, r=0.55, g=0.35, b=0.05)
            self.cursor_y -= 20

        self.cursor_y -= 18

    def build(self, filename):
        if self.current_stream:
            self.pages.append("".join(self.current_stream))

        num_pages = len(self.pages)
        objects = []
        
        # Add footers
        for i in range(num_pages):
            footer_stream = []
            f_y = 25
            footer_stream.append(f"0.8 0.8 0.8 RG\n0.5 w {self.margin_left:.2f} {f_y + 12:.2f} m {self.margin_left + self.usable_width:.2f} {f_y + 12:.2f} l S\n")
            clean_l = "MTF CDR Toolkit - Complete English User Manual & Operating Guide"
            clean_r = f"Page {i+1} of {num_pages}"
            footer_stream.append(f"BT /F1 8 Tf 0.5 0.55 0.6 rg {self.margin_left:.2f} {f_y:.2f} Td ({clean_l}) Tj ET\n")
            footer_stream.append(f"BT /F1 8 Tf 0.5 0.55 0.6 rg {self.margin_left + self.usable_width - 50:.2f} {f_y:.2f} Td ({clean_r}) Tj ET\n")
            self.pages[i] = self.pages[i] + "".join(footer_stream)

        page_obj_ids = [5 + 2*i for i in range(num_pages)]

        # 1: Catalog
        objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
        
        # 2: Pages
        kids_str = " ".join(f"{pid} 0 R" for pid in page_obj_ids)
        objects.append(f"<< /Type /Pages /Kids [{kids_str}] /Count {num_pages} >>".encode('utf-8'))

        # 3: Font Helvetica
        objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
        
        # 4: Font Helvetica-Bold
        objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")

        # Pages and Streams
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
        print(f"Generated {filename} ({len(out)} bytes, {num_pages} pages)")


pdf = SimplePDF()

# PAGE 1
pdf.add_header(
    "MTF / CDR Toolkit - User Manual",
    "Complete step-by-step operating guide for all 6 converters (English)"
)

pdf.add_callout(
    "QUICK OVERVIEW & SECURITY ARCHITECTURE:\n"
    "* 100% Client-Side Processing: All files are processed inside your browser RAM and never uploaded.\n"
    "* Portal Access: Sign in with your admin credentials and select your tool from the left navigation bar."
)

pdf.add_tool_card(
    num=1,
    title="Disposition Remark Converter",
    subtitle="1-disposition-remark.html",
    purpose="Filter raw CDR CSV for MTF-CROSS SELL campaign, attach manual remarks to leads, and export Excel.",
    steps=[
        "Upload CDR CSV: Click 'Upload the CDR CSV file' to select your raw dialer file (Auto-filtered).",
        "Paste Remarks: Paste Remark heading, followed by 'lead_id: 12345' lines (or '12345 <tab> Remark').",
        "Download Excel: Select the target date and choose 'Interested only', 'Connected to executive only', or both."
    ],
    tip="Verify the live counter in Step 2 ('Remarks found: X, without remark: Y'). Extra or invalid IDs are alerted."
)

pdf.add_tool_card(
    num=2,
    title="Excel to JSON Converter",
    subtitle="2-excel-to-json.html",
    purpose="Convert call spreadsheets (.xlsx, .xlsm, or .csv) into clean, standardized CRM API JSON arrays.",
    steps=[
        "Choose File: Drag and drop your Excel or CSV file into the drop zone or browse your local drive.",
        "Auto-Detect Mapping: The tool automatically maps lead_id, call_id, disposition, and sub_disposition.",
        "Copy / Download: The formatted JSON renders instantly on the right. Click 'Copy JSON' or 'Download .json'."
    ],
    tip="Duplicate Call IDs and rows missing required lead_id or call_id values are automatically discarded."
)

pdf.add_tool_card(
    num=3,
    title="API Request Sender",
    subtitle="3-api-sender.html",
    purpose="Directly dispatch JSON payloads (from Tool 2) to your target CRM or dialer API without using Postman.",
    steps=[
        "Configure Endpoint: Select the HTTP Method (e.g., POST) and enter your full API endpoint URL.",
        "Set Authentication: Choose your Auth scheme (Bearer Token, Basic Auth, or API Key header) and input token.",
        "Load JSON Payload: Click 'Use JSON from converter' to import the generated JSON from Tool 2 automatically.",
        "Send Request: Click 'Send' and review the real-time HTTP status code (200 OK), latency (ms), and body."
    ],
    tip="SSRF Protected: Serverless proxy enforces strict restrictions preventing access to private/internal IP ranges."
)

# PAGE 2
pdf.new_page()

pdf.add_header(
    "MTF / CDR Toolkit - User Manual (Part 2)",
    "Answer Null CDR Filters, CRM Lead Formatter & Pivot Table Guide"
)

pdf.add_tool_card(
    num=4,
    title="Download Answer Null CDR",
    subtitle="4-answer-null-cdr.html",
    purpose="Identify and extract calls answered at the gateway telephony level but left un-dispositioned (Null) in CRM.",
    steps=[
        "Upload File: Drag and drop your raw CDR CSV file into the upload zone.",
        "Verify Filters: Campaign='MTF-CROSS SELL', Gateway='ANSWER', CRM='Keep null rows only' (default).",
        "Convert & Export: Click 'Convert & Download XLSX'. A clean, filtered spreadsheet downloads immediately."
    ],
    tip="Track the real-time stage badges: Total Rows -> Campaign Matches -> Gateway Answered -> Final Filtered."
)

pdf.add_tool_card(
    num=5,
    title="Answer Null Lead Data",
    subtitle="5-lead-to-answer-null.html",
    purpose="Transform filtered Answer Null records into the standard 57-column CRM import spreadsheet template.",
    steps=[
        "Upload Lead Data: Drop your Lead Data spreadsheet (.xlsx) into the file card.",
        "Set Date & Time: Pick the calling date and time via the 'date_entered' picker to stamp the batch.",
        "Download Sheet: Click 'Convert & Download'. The file [Date]_MTF_ANSWER_NULL.xlsx is generated instantly."
    ],
    tip="Required Columns: Input file must contain CUSTOMER NAME, RECORD ID, Remark, CALL ID, and CALL ATTEMPT."
)

pdf.add_tool_card(
    num=6,
    title="Sub-Disposition Pivot Converter",
    subtitle="6-sub-disposition-pivot.html",
    purpose="Generate Sub-Disposition pivot summaries, calculate Call Connectivity %, and export reporting graphics.",
    steps=[
        "Upload Spreadsheet: Drop your CDR CSV or Excel file into the upload box.",
        "Instant Reporting: Two live tables render: Sub-Disposition frequency counts and Call Connectivity metrics.",
        "Export & Share: Click 'Copy screenshot' to paste directly into WhatsApp/Email (Ctrl+V), or download XLSX/PNG."
    ],
    tip="Connectivity Formula: Connectivity % = (Connected Contacted Calls / Total Dialed Calls) * 100."
)

pdf.add_callout(
    "STANDARD CHECKLIST & TROUBLESHOOTING:\n"
    "1. 'Columns not found': Ensure your file header names match standard columns (CAMPAIGN NAME, RECORD ID).\n"
    "2. 'No rows matched': Verify the exact case/spelling of campaign name (Default: MTF-CROSS SELL).\n"
    "3. Image copy permissions: If browser blocks clipboard access, click 'Download screenshot (PNG)' instead."
)

pdf.build("D:\\Wannee-Ai\\Converter\\MTF-Toolkit\\CDR_Toolkit_User_Manual.pdf")
