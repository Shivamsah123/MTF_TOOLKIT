import sys
import os

class ModernPDF:
    def __init__(self):
        self.pages = []
        self.current_stream = []
        self.width = 595.28   # A4 width in pt
        self.height = 841.89  # A4 height in pt
        self.margin_left = 36
        self.margin_right = 36
        self.margin_top = 38
        self.margin_bottom = 38
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
        clean_text = str(text).replace("—", "-").replace("–", "-").replace("•", "*").replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
        clean_text = clean_text.replace("📂", "[FILE]").replace("⚡", "[API]").replace("💾", "[SAVE]").replace("✅", "[OK]").replace("📅", "[DATE]").replace("📞", "[CALL]")
        clean_text = clean_text.encode('ascii', errors='ignore').decode('ascii')
        clean_text = clean_text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        self.set_fill_color(r, g, b)
        self.current_stream.append(
            f"BT /{font} {size} Tf {x:.2f} {y:.2f} Td ({clean_text}) Tj ET\n"
        )

    def draw_line(self, x1, y1, x2, y2, width=1, r=0.8, g=0.8, b=0.8):
        self.set_stroke_color(r, g, b)
        self.current_stream.append(f"{width:.2f} w {x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S\n")

    def add_top_banner(self, title, subtitle, page_num_str=""):
        top_y = self.cursor_y
        banner_h = 36
        # Background
        self.set_fill_color(0.12, 0.18, 0.30) # #1f2d4d Navy
        self.rect(self.margin_left, top_y - banner_h, self.usable_width, banner_h, fill=True, stroke=False)
        # Left Pink Accent Stripe
        self.set_fill_color(0.996, 0.004, 0.408) # #fe0168 Pink
        self.rect(self.margin_left, top_y - banner_h, 5, banner_h, fill=True, stroke=False)

        # Title
        self.draw_text(title, self.margin_left + 14, top_y - 15, font="F2", size=13.5, r=1, g=1, b=1)
        # Subtitle
        self.draw_text(subtitle, self.margin_left + 14, top_y - 27, font="F1", size=8.5, r=0.8, g=0.85, b=0.92)

        if page_num_str:
            self.draw_text(page_num_str, self.margin_left + self.usable_width - 80, top_y - 20, font="F2", size=8.5, r=0.996, g=0.004, b=0.408)

        self.cursor_y -= (banner_h + 14)

    def add_callout(self, title, desc, r_bg=0.96, g_bg=0.98, b_bg=1.0, r_border=0.75, g_border=0.85, b_border=0.98, r_accent=0.15, g_accent=0.45, b_accent=0.85):
        box_h = 32
        box_y = self.cursor_y - box_h
        self.set_fill_color(r_bg, g_bg, b_bg)
        self.set_stroke_color(r_border, g_border, b_border)
        self.rect(self.margin_left, box_y, self.usable_width, box_h, fill=True, stroke=True, line_width=0.8)
        self.set_fill_color(r_accent, g_accent, b_accent)
        self.rect(self.margin_left, box_y, 4, box_h, fill=True, stroke=False)

        self.draw_text(title, self.margin_left + 12, box_y + 19, font="F2", size=8.5, r=r_accent, g=g_accent, b=b_accent)
        self.draw_text(desc, self.margin_left + 12, box_y + 8, font="F1", size=8.2, r=0.2, g=0.25, b=0.32)
        self.cursor_y -= (box_h + 12)

    def add_tool_card(self, num, title, subtitle, purpose, steps, mockup_fn=None, card_h=150):
        top_y = self.cursor_y

        # Card container
        self.set_fill_color(0.995, 0.995, 1.0)
        self.set_stroke_color(0.85, 0.88, 0.94)
        self.rect(self.margin_left, top_y - card_h, self.usable_width, card_h, fill=True, stroke=True, line_width=0.8)

        # Header bar of card
        header_h = 24
        self.set_fill_color(0.94, 0.96, 0.99)
        self.rect(self.margin_left, top_y - header_h, self.usable_width, header_h, fill=True, stroke=False)
        self.draw_line(self.margin_left, top_y - header_h, self.margin_left + self.usable_width, top_y - header_h, width=0.6, r=0.82, g=0.86, b=0.92)

        # Badge
        self.set_fill_color(0.996, 0.004, 0.408) # Waanee Pink
        self.rect(self.margin_left + 8, top_y - header_h + 3, 18, 18, fill=True, stroke=False)
        self.draw_text(str(num), self.margin_left + 14, top_y - header_h + 8, font="F2", size=10, r=1, g=1, b=1)

        self.draw_text(title, self.margin_left + 32, top_y - 15, font="F2", size=11, r=0.12, g=0.18, b=0.30)
        self.draw_text(subtitle, self.margin_left + 230, top_y - 15, font="F1", size=8, r=0.45, g=0.5, b=0.6)

        # Content columns: Left (Instructions), Right (Mockup UI box)
        left_w = 260
        right_w = self.usable_width - left_w - 20
        right_x = self.margin_left + left_w + 14

        # Left Column text
        curr_y = top_y - header_h - 12
        self.draw_text("PURPOSE & BUSINESS IMPACT:", self.margin_left + 10, curr_y, font="F2", size=7.8, r=0.15, g=0.45, b=0.85)
        curr_y -= 10
        self.draw_text(purpose, self.margin_left + 10, curr_y, font="F1", size=7.8, r=0.25, g=0.3, b=0.35)
        curr_y -= 14

        self.draw_text("STEP-BY-STEP OPERATION:", self.margin_left + 10, curr_y, font="F2", size=7.8, r=0.15, g=0.45, b=0.85)
        curr_y -= 11

        for i, step_text in enumerate(steps, 1):
            self.draw_text(f"{i}.", self.margin_left + 10, curr_y, font="F2", size=7.8, r=0.996, g=0.004, b=0.408)
            self.draw_text(step_text, self.margin_left + 22, curr_y, font="F1", size=7.6, r=0.2, g=0.25, b=0.3)
            curr_y -= 11.5

        # Right Column Mockup Box
        if mockup_fn:
            mock_h = card_h - header_h - 16
            mock_y = top_y - header_h - mock_h - 8
            # Outer Mockup Window
            self.set_fill_color(1, 1, 1)
            self.set_stroke_color(0.85, 0.88, 0.92)
            self.rect(right_x, mock_y, right_w, mock_h, fill=True, stroke=True, line_width=0.6)
            # Window Header
            self.set_fill_color(0.96, 0.97, 0.99)
            self.rect(right_x, mock_y + mock_h - 14, right_w, 14, fill=True, stroke=False)
            self.draw_line(right_x, mock_y + mock_h - 14, right_x + right_w, mock_y + mock_h - 14, width=0.5, r=0.85, g=0.88, b=0.92)
            # Dots
            self.set_fill_color(0.9, 0.4, 0.4)
            self.rect(right_x + 6, mock_y + mock_h - 10, 4.5, 4.5, fill=True, stroke=False)
            self.set_fill_color(0.9, 0.7, 0.3)
            self.rect(right_x + 13, mock_y + mock_h - 10, 4.5, 4.5, fill=True, stroke=False)
            self.set_fill_color(0.4, 0.8, 0.4)
            self.rect(right_x + 20, mock_y + mock_h - 10, 4.5, 4.5, fill=True, stroke=False)
            self.draw_text("UI Mockup & Live Output Preview", right_x + 30, mock_y + mock_h - 10.5, font="F2", size=6.8, r=0.4, g=0.45, b=0.55)

            # Draw Custom Mockup
            mockup_fn(self, right_x + 6, mock_y + 4, right_w - 12, mock_h - 22)

        self.cursor_y -= (card_h + 14)

    def build(self, filename):
        if self.current_stream:
            self.pages.append("".join(self.current_stream))

        num_pages = len(self.pages)
        objects = []

        # Footer for each page
        for i in range(num_pages):
            footer_stream = []
            f_y = 20
            footer_stream.append(f"0.82 0.85 0.9 RG\n0.6 w {self.margin_left:.2f} {f_y + 10:.2f} m {self.margin_left + self.usable_width:.2f} {f_y + 10:.2f} l S\n")
            clean_l = "Waanee AI - MTF CDR Toolkit Suite (v2.0) | Production Operations & User Manual"
            clean_r = f"Page {i+1} of {num_pages}"
            footer_stream.append(f"BT /F1 7.2 Tf 0.45 0.5 0.6 rg {self.margin_left:.2f} {f_y:.2f} Td ({clean_l}) Tj ET\n")
            footer_stream.append(f"BT /F2 7.2 Tf 0.996 0.004 0.408 rg {self.margin_left + self.usable_width - 55:.2f} {f_y:.2f} Td ({clean_r}) Tj ET\n")
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
        print(f"[SUCCESS] Built complete manual: {filename} ({num_pages} pages)")

# ----------------- MAIN SCRIPT GENERATION -----------------
pdf = ModernPDF()

# ================= PAGE 1: COVER & ARCHITECTURE =================
pdf.add_top_banner("WAANEE AI — MTF CDR TOOLKIT SUITE (v2.0)", "Complete Operational Reference & Step-by-Step Training Manual", "OVERVIEW")

pdf.add_callout(
    "ENTERPRISE PRODUCTION READY ARCHITECTURE",
    "Full-stack React 19 + Node.js/Vercel Serverless. 100% Client-side conversions + Supabase Cloud Database + Browser Fallback.",
    r_bg=0.98, g_bg=0.96, b_bg=1.0, r_border=0.85, g_border=0.75, b_border=0.98, r_accent=0.6, g_accent=0.1, b_accent=0.7
)

# Authentication & Session Architecture Box
sec_h = 135
sec_y = pdf.cursor_y - sec_h
pdf.set_fill_color(0.985, 0.99, 1.0)
pdf.set_stroke_color(0.8, 0.85, 0.92)
pdf.rect(pdf.margin_left, sec_y, pdf.usable_width, sec_h, fill=True, stroke=True, line_width=1)
# Header
pdf.set_fill_color(0.12, 0.18, 0.30)
pdf.rect(pdf.margin_left, sec_y + sec_h - 20, pdf.usable_width, 20, fill=True, stroke=False)
pdf.draw_text("SECURITY, AUTHENTICATION & MULTI-USER ACCESS ARCHITECTURE", pdf.margin_left + 10, sec_y + sec_h - 14, font="F2", size=9, r=1, g=1, b=1)

auth_points = [
    ("Stateless HMAC-SHA256 Signed Tokens", "Tokens stored in HttpOnly secure cookies. No memory overhead on server."),
    ("Unlimited Simultaneous Users", "Stateless architecture allows 5, 20, or 100+ team members to log in concurrently."),
    ("12-Hour Continuous Session (SESSION_MAX_AGE)", "Log in once at 8 AM and work uninterrupted till 8 PM without re-login."),
    ("Brute-Force Rate Limiter Protection", "5 failed password attempts automatically trigger a 15-minute security lock on IP."),
    ("SSRF-Protected REST API Proxy (/api/send)", "Direct gateway queries block private/loopback/cloud metadata IP ranges."),
    ("100% In-Browser Privacy & Speed", "CDR processing, Excel generation, and JSON parsing execute in client RAM.")
]

ay = sec_y + sec_h - 35
for title, desc in auth_points:
    pdf.set_fill_color(0.996, 0.004, 0.408)
    pdf.rect(pdf.margin_left + 12, ay + 2, 4, 4, fill=True, stroke=False)
    pdf.draw_text(title + ":", pdf.margin_left + 22, ay, font="F2", size=7.8, r=0.12, g=0.18, b=0.30)
    pdf.draw_text(desc, pdf.margin_left + 215, ay, font="F1", size=7.6, r=0.25, g=0.3, b=0.38)
    ay -= 16

pdf.cursor_y -= (sec_h + 16)

# Table of Contents / Tool Index Map
toc_h = 185
toc_y = pdf.cursor_y - toc_h
pdf.set_fill_color(1, 1, 1)
pdf.set_stroke_color(0.85, 0.88, 0.94)
pdf.rect(pdf.margin_left, toc_y, pdf.usable_width, toc_h, fill=True, stroke=True, line_width=1)
# Header
pdf.set_fill_color(0.94, 0.96, 0.99)
pdf.rect(pdf.margin_left, toc_y + toc_h - 22, pdf.usable_width, 22, fill=True, stroke=False)
pdf.draw_line(pdf.margin_left, toc_y + toc_h - 22, pdf.margin_left + pdf.usable_width, toc_y + toc_h - 22, width=0.6, r=0.85, g=0.88, b=0.92)
pdf.draw_text("COMPLETE TOOLKIT MODULE DIRECTORY (ALL 7 INDEPENDENT TOOLS)", pdf.margin_left + 10, toc_y + toc_h - 15, font="F2", size=9, r=0.12, g=0.18, b=0.30)

tools_summary = [
    ("Tool 1", "Disposition Remark Converter", "Map QA/Agent remarks to matched Lead IDs & export formatted Excel", "Page 2"),
    ("Tool 2", "Excel to JSON Converter", "Multi-sheet workbook parser & structured JSON payload generator", "Page 2"),
    ("Tool 3", "API Request Sender", "SSRF-protected REST API client for testing CRM webhook endpoints", "Page 3"),
    ("Tool 4", "Answer Null CDR Filter", "Segregate Answered calls with empty CRM status for redialing campaigns", "Page 3"),
    ("Tool 5", "Lead to Answer Null Generator", "Map raw dialer fields into 57-column standardized CRM lead schema", "Page 4"),
    ("Tool 6", "Sub-Disposition Pivot Converter", "Dual Mode: Portal API Fetch or CSV drop + Automated Pivot + 8 PM Save", "Page 4-5"),
    ("Tool 7", "Daily Analytics & Trend Tracker", "Multi-month comparative dashboard, profit/loss trend & Supabase database", "Page 6")
]

ty = toc_y + toc_h - 40
for num, tname, tdesc, pg in tools_summary:
    pdf.set_fill_color(0.996, 0.004, 0.408)
    pdf.rect(pdf.margin_left + 10, ty - 1, 35, 12, fill=True, stroke=False)
    pdf.draw_text(num, pdf.margin_left + 15, ty + 2.5, font="F2", size=7.2, r=1, g=1, b=1)
    pdf.draw_text(tname, pdf.margin_left + 52, ty + 2.5, font="F2", size=8, r=0.12, g=0.18, b=0.30)
    pdf.draw_text(tdesc, pdf.margin_left + 220, ty + 2.5, font="F1", size=7.6, r=0.3, g=0.35, b=0.45)
    pdf.draw_text(pg, pdf.margin_left + pdf.usable_width - 45, ty + 2.5, font="F2", size=7.6, r=0.15, g=0.45, b=0.85)
    pdf.draw_line(pdf.margin_left + 10, ty - 6, pdf.margin_left + pdf.usable_width - 10, ty - 6, width=0.4, r=0.9, g=0.92, b=0.96)
    ty -= 20

pdf.cursor_y -= (toc_h + 10)


# ================= PAGE 2: TOOL 1 & TOOL 2 =================
pdf.new_page()
pdf.add_top_banner("TOOL 1 & TOOL 2: DATA TRANSFORMATION SUITE", "Remark Injection, Column Mapping, and Structured JSON Generation", "MODULES 1 & 2")

def mockup_tool1(p, x, y, w, h):
    p.draw_text("Campaign: MTF-CROSS SELL (8,420 rows)", x + 2, y + h - 8, font="F2", size=6.5, r=0.2, g=0.3, b=0.5)
    # Lead ID box
    p.set_fill_color(0.95, 0.97, 1.0)
    p.rect(x + 2, y + h - 42, 60, 30, fill=True, stroke=True, line_width=0.4)
    p.draw_text("Paste IDs (e.g. 10245, 10246)", x + 4, y + h - 18, font="F1", size=5.5, r=0.4, g=0.45, b=0.5)
    # Output table
    p.set_fill_color(0.92, 0.95, 0.99)
    p.rect(x + 66, y + h - 20, w - 68, 8, fill=True, stroke=False)
    p.draw_text("Lead ID | Dispo | Remark Added", x + 70, y + h - 15, font="F2", size=5.8, r=0.1, g=0.2, b=0.4)
    p.draw_text("10245 | Interested | Call Back on Monday", x + 70, y + h - 28, font="F1", size=5.5, r=0.2, g=0.5, b=0.2)
    p.draw_text("10246 | Interested | Shared Quotation via WA", x + 70, y + h - 38, font="F1", size=5.5, r=0.2, g=0.5, b=0.2)
    # Button
    p.set_fill_color(0.06, 0.72, 0.5)
    p.rect(x + 2, y + 4, w - 4, 12, fill=True, stroke=False)
    p.draw_text("Download Enhanced Excel (.xlsx)", x + 35, y + 8, font="F2", size=6.5, r=1, g=1, b=1)

pdf.add_tool_card(
    1,
    "Disposition Remark Converter",
    "site/tools/1-disposition-remark",
    "Inject custom agent feedback or QA remarks into matched Lead IDs for CRM upload.",
    [
        "Upload raw CDR CSV/XLSX file via drag-and-drop zone.",
        "Select target campaign filter (Default: MTF-CROSS SELL).",
        "Paste Lead IDs in the textarea (separated by commas or newlines).",
        "Type the Remark text (e.g. 'Interested - Call Back Tomorrow').",
        "Select Match Mode ('Interested Only' or 'All Dispositions').",
        "Click 'Download Excel (.xlsx)' to get updated file with 'Remark' column."
    ],
    mockup_tool1,
    card_h=155
)

def mockup_tool2(p, x, y, w, h):
    p.draw_text("Workbook: Leads_October.xlsx (3 Sheets)", x + 2, y + h - 8, font="F2", size=6.5, r=0.2, g=0.3, b=0.5)
    p.set_fill_color(0.98, 0.98, 0.98)
    p.rect(x + 2, y + 20, w - 4, h - 32, fill=True, stroke=True, line_width=0.4)
    # JSON snippet
    p.draw_text("[", x + 6, y + h - 20, font="F2", size=6, r=0.1, g=0.1, b=0.1)
    p.draw_text('  { "lead_id": "90214", "campaign": "MTF",', x + 10, y + h - 28, font="F1", size=5.5, r=0.1, g=0.3, b=0.7)
    p.draw_text('    "phone": "+919876543210", "status": "ANSWER",', x + 10, y + h - 36, font="F1", size=5.5, r=0.1, g=0.3, b=0.7)
    p.draw_text('    "sub_disposition": "Interested" }, ...', x + 10, y + h - 44, font="F1", size=5.5, r=0.1, g=0.3, b=0.7)
    p.draw_text("]", x + 6, y + h - 52, font="F2", size=6, r=0.1, g=0.1, b=0.1)
    # Buttons
    p.set_fill_color(0.12, 0.18, 0.30)
    p.rect(x + 2, y + 4, (w-8)/2, 12, fill=True, stroke=False)
    p.draw_text("Copy JSON (Ctrl+C)", x + 10, y + 8, font="F2", size=6.2, r=1, g=1, b=1)
    p.set_fill_color(0.996, 0.004, 0.408)
    p.rect(x + 6 + (w-8)/2, y + 4, (w-8)/2, 12, fill=True, stroke=False)
    p.draw_text("Download .json", x + 14 + (w-8)/2, y + 8, font="F2", size=6.2, r=1, g=1, b=1)

pdf.add_tool_card(
    2,
    "Excel to JSON Converter",
    "site/tools/2-excel-to-json",
    "Convert complex multi-sheet Excel spreadsheets into clean, structured JSON objects.",
    [
        "Drop multi-sheet workbook (.xlsx, .xls) into converter.",
        "Choose the exact sheet to convert from the dropdown list.",
        "Toggle 'Trim whitespace' and 'Include empty sub_disposition' options.",
        "Live JSON preview renders instantly with syntax validation.",
        "Click 'Copy JSON' for 1-click clipboard paste or 'Download JSON File'."
    ],
    mockup_tool2,
    card_h=155
)


# ================= PAGE 3: TOOL 3 & TOOL 4 =================
pdf.new_page()
pdf.add_top_banner("TOOL 3 & TOOL 4: API CLIENT & ANSWER NULL FILTER", "Hardened SSRF Proxy Gateway & Dialed Call Segregation", "MODULES 3 & 4")

def mockup_tool3(p, x, y, w, h):
    p.draw_text("POST  https://api.crm.waanee.ai/v1/leads", x + 2, y + h - 8, font="F2", size=6.5, r=0.996, g=0.004, b=0.408)
    p.draw_text("Header: Authorization: Bearer eyJhbGciOi...", x + 2, y + h - 17, font="F1", size=5.5, r=0.4, g=0.45, b=0.5)
    # Response box
    p.set_fill_color(0.92, 0.98, 0.94)
    p.rect(x + 2, y + 18, w - 4, h - 38, fill=True, stroke=True, line_width=0.4)
    p.draw_text("STATUS: 200 OK  |  Time: 182ms  |  Size: 412 B", x + 6, y + h - 28, font="F2", size=6, r=0.08, g=0.5, b=0.2)
    p.draw_text('{ "success": true, "inserted_count": 142,', x + 6, y + h - 38, font="F1", size=5.5, r=0.1, g=0.2, b=0.3)
    p.draw_text('  "batch_id": "BAT_20261112_01" }', x + 6, y + h - 46, font="F1", size=5.5, r=0.1, g=0.2, b=0.3)
    # Action
    p.set_fill_color(0.12, 0.18, 0.30)
    p.rect(x + 2, y + 4, w - 4, 11, fill=True, stroke=False)
    p.draw_text("Send Request via SSRF Gateway", x + 30, y + 7.5, font="F2", size=6.2, r=1, g=1, b=1)

pdf.add_tool_card(
    3,
    "API Request Sender (SSRF Proxy)",
    "site/tools/3-api-sender",
    "Test CRM endpoints & send JSON payloads securely through native backend proxy.",
    [
        "Enter Target Endpoint URL (HTTPS protocol required).",
        "Select HTTP Method (POST, GET, PUT, PATCH, DELETE).",
        "Paste Authorization Bearer token or custom headers.",
        "Paste JSON payload into the Body editor (can be copied from Tool 2).",
        "Click 'Send Request' — request is forwarded via backend SSRF proxy.",
        "Inspect HTTP response status, execution latency, and formatted response body."
    ],
    mockup_tool3,
    card_h=155
)

def mockup_tool4(p, x, y, w, h):
    p.draw_text("Rule: GATEWAY = 'Answer' AND CRM = 'null'", x + 2, y + h - 8, font="F2", size=6.5, r=0.1, g=0.3, b=0.6)
    # Table snippet
    p.set_fill_color(0.92, 0.94, 0.98)
    p.rect(x + 2, y + h - 20, w - 4, 8, fill=True, stroke=False)
    p.draw_text("Phone | Gateway Dispo | CRM Dispo | Action", x + 4, y + h - 15, font="F2", size=5.8, r=0.1, g=0.2, b=0.4)
    p.draw_text("+919876501234 | Answer | null | Segregated", x + 4, y + h - 27, font="F1", size=5.5, r=0.8, g=0.2, b=0.2)
    p.draw_text("+919876505678 | Answer | null | Segregated", x + 4, y + h - 36, font="F1", size=5.5, r=0.8, g=0.2, b=0.2)
    p.draw_text("Total Answer Null Identified: 412 calls", x + 4, y + h - 47, font="F2", size=6, r=0.996, g=0.004, b=0.408)
    # Download button
    p.set_fill_color(0.06, 0.72, 0.5)
    p.rect(x + 2, y + 4, w - 4, 11, fill=True, stroke=False)
    p.draw_text("Download Filtered Answer Null Excel (.xlsx)", x + 20, y + 7.5, font="F2", size=6.2, r=1, g=1, b=1)

pdf.add_tool_card(
    4,
    "Answer Null CDR Filter",
    "site/tools/4-answer-null-cdr",
    "Identify calls that connected at telecom gateway but dropped before agent CRM assignment.",
    [
        "Upload raw daily dialer export CDR file.",
        "Automatic detection filters: Gateway = 'Answer' AND CRM = 'null' / blank.",
        "View segregation summary: Total calls vs Answer Null count.",
        "Isolate numbers for immediate automated redialing campaigns.",
        "Click 'Download Filtered Excel' to generate clean list for campaign manager."
    ],
    mockup_tool4,
    card_h=155
)


# ================= PAGE 4: TOOL 5 & TOOL 6 (DUAL MODE) =================
pdf.new_page()
pdf.add_top_banner("TOOL 5 & TOOL 6: CRM LEAD FORMATTING & PORTAL FETCH", "57-Column Mapping & Direct Waanee Portal Integration", "MODULES 5 & 6")

def mockup_tool5(p, x, y, w, h):
    p.draw_text("Standard 57-Column CRM Lead Format", x + 2, y + h - 8, font="F2", size=6.5, r=0.2, g=0.3, b=0.5)
    p.set_fill_color(0.96, 0.97, 0.99)
    p.rect(x + 2, y + 18, w - 4, h - 28, fill=True, stroke=True, line_width=0.4)
    cols = ["Lead_ID", "First_Name", "Phone_1", "Campaign", "Status", "Custom_1..52"]
    cx = x + 4
    for c in cols:
        p.draw_text(c, cx, y + h - 20, font="F2", size=5.2, r=0.1, g=0.3, b=0.6)
        p.draw_text("Val_" + c[:3], cx, y + h - 30, font="F1", size=5.0, r=0.3, g=0.35, b=0.4)
        cx += 28
    p.set_fill_color(0.12, 0.18, 0.30)
    p.rect(x + 2, y + 4, w - 4, 11, fill=True, stroke=False)
    p.draw_text("Export CRM Re-Upload Template (.xlsx)", x + 25, y + 7.5, font="F2", size=6.2, r=1, g=1, b=1)

pdf.add_tool_card(
    5,
    "Lead to Answer Null Generator",
    "site/tools/5-lead-to-answer-null",
    "Format isolated Answer Null records directly into CRM's official 57-field upload format.",
    [
        "Input Answer Null records generated from Tool 4.",
        "Mapper maps Phone, Contact Name, DID, and custom metadata fields.",
        "Generates all 57 columns required by CRM bulk lead ingestion API.",
        "Ensures zero schema rejection errors during daily lead re-injection."
    ],
    mockup_tool5,
    card_h=135
)

# Tool 6 Dual Mode Feature Breakdown Box
pdf.draw_text("TOOL 6: SUB-DISPOSITION PIVOT CONVERTER (DUAL-MODE CAPABILITY)", pdf.margin_left, pdf.cursor_y, font="F2", size=10, r=0.12, g=0.18, b=0.30)
pdf.cursor_y -= 12

dm_h = 175
dm_y = pdf.cursor_y - dm_h
pdf.set_fill_color(0.99, 1.0, 0.99)
pdf.set_stroke_color(0.7, 0.85, 0.75)
pdf.rect(pdf.margin_left, dm_y, pdf.usable_width, dm_h, fill=True, stroke=True, line_width=0.8)

# Header
pdf.set_fill_color(0.06, 0.72, 0.5)
pdf.rect(pdf.margin_left, dm_y + dm_h - 20, pdf.usable_width, 20, fill=True, stroke=False)
pdf.draw_text("DIRECT WAANEE DIAL PORTAL FETCH (API) vs MANUAL FILE UPLOAD", pdf.margin_left + 10, dm_y + dm_h - 14, font="F2", size=8.8, r=1, g=1, b=1)

# Two Sub-Columns inside Box
half_w = (pdf.usable_width - 24) / 2
# Mode A: Upload
pdf.draw_text("MODE 1: 📂 MANUAL FILE UPLOAD", pdf.margin_left + 10, dm_y + dm_h - 35, font="F2", size=8, r=0.15, g=0.45, b=0.85)
pdf.draw_text("Traditional workflow: Drag and drop exported", pdf.margin_left + 10, dm_y + dm_h - 47, font="F1", size=7.5, r=0.2, g=0.25, b=0.3)
pdf.draw_text("CSV/XLSX file from your local computer.", pdf.margin_left + 10, dm_y + dm_h - 57, font="F1", size=7.5, r=0.2, g=0.25, b=0.3)
pdf.draw_text("Works offline with zero internet dependency.", pdf.margin_left + 10, dm_y + dm_h - 67, font="F1", size=7.5, r=0.2, g=0.25, b=0.3)

# Mode B: Direct Portal Fetch
pdf.draw_text("MODE 2: ⚡ DIRECT DIAL PORTAL FETCH", pdf.margin_left + 20 + half_w, dm_y + dm_h - 35, font="F2", size=8, r=0.996, g=0.004, b=0.408)
pdf.draw_text("Matches portal screen (msl.waanee.ai/#/charts):", pdf.margin_left + 20 + half_w, dm_y + dm_h - 47, font="F1", size=7.5, r=0.2, g=0.25, b=0.3)
pdf.draw_text("- Call Type: Predictive, Manual, Inbound", pdf.margin_left + 20 + half_w, dm_y + dm_h - 57, font="F1", size=7.5, r=0.2, g=0.25, b=0.3)
pdf.draw_text("- From / To Date-Time Pickers", pdf.margin_left + 20 + half_w, dm_y + dm_h - 67, font="F1", size=7.5, r=0.2, g=0.25, b=0.3)
pdf.draw_text("- Campaign: MTF-CROSS SELL, South Bot, etc.", pdf.margin_left + 20 + half_w, dm_y + dm_h - 77, font="F1", size=7.5, r=0.2, g=0.25, b=0.3)

# 3 Color-Coded Portal Action Buttons
pdf.draw_line(pdf.margin_left + 10, dm_y + 82, pdf.margin_left + pdf.usable_width - 10, dm_y + 82, width=0.5, r=0.8, g=0.85, b=0.8)
pdf.draw_text("3 COLOR-CODED PORTAL ACTION BUTTONS:", pdf.margin_left + 10, dm_y + 68, font="F2", size=8, r=0.12, g=0.18, b=0.30)

btn_y = dm_y + 48
# Pink Search
pdf.set_fill_color(0.996, 0.004, 0.408)
pdf.rect(pdf.margin_left + 12, btn_y, 75, 14, fill=True, stroke=False)
pdf.draw_text("Search (Pink)", pdf.margin_left + 24, btn_y + 4, font="F2", size=7, r=1, g=1, b=1)
pdf.draw_text("Hits portal API, fetches live CDR, renders Pivot table & preview", pdf.margin_left + 95, btn_y + 4, font="F1", size=7.4, r=0.25, g=0.3, b=0.35)

# Green Clear
pdf.set_fill_color(0.06, 0.72, 0.5)
pdf.rect(pdf.margin_left + 12, btn_y - 18, 75, 14, fill=True, stroke=False)
pdf.draw_text("Clear (Green)", pdf.margin_left + 24, btn_y - 14, font="F2", size=7, r=1, g=1, b=1)
pdf.draw_text("Resets From/To timestamps and Campaign filters to default", pdf.margin_left + 95, btn_y - 14, font="F1", size=7.4, r=0.25, g=0.3, b=0.35)

# Cyan Export
pdf.set_fill_color(0.01, 0.52, 0.78)
pdf.rect(pdf.margin_left + 12, btn_y - 36, 75, 14, fill=True, stroke=False)
pdf.draw_text("Export (Cyan)", pdf.margin_left + 24, btn_y - 32, font="F2", size=7, r=1, g=1, b=1)
pdf.draw_text("Immediately downloads the raw CDR CSV file directly to your PC", pdf.margin_left + 95, btn_y - 32, font="F1", size=7.4, r=0.25, g=0.3, b=0.35)

pdf.cursor_y -= (dm_h + 10)


# ================= PAGE 5: TOOL 6 (PIVOT & 8 PM SAVE) =================
pdf.new_page()
pdf.add_top_banner("TOOL 6: AUTOMATED PIVOT TABLE & 8 PM DAILY SAVE", "Instant WhatsApp Report Cards & 2-Step Confirmation Modal", "PIVOT & 8 PM SAVE")

# Pivot Table Explanation
piv_h = 160
piv_y = pdf.cursor_y - piv_h
pdf.set_fill_color(1, 1, 1)
pdf.set_stroke_color(0.85, 0.88, 0.94)
pdf.rect(pdf.margin_left, piv_y, pdf.usable_width, piv_h, fill=True, stroke=True, line_width=0.8)

# Header
pdf.set_fill_color(0.12, 0.18, 0.30)
pdf.rect(pdf.margin_left, piv_y + piv_h - 20, pdf.usable_width, 20, fill=True, stroke=False)
pdf.draw_text("SUB-DISPOSITION PIVOT & CALL CONNECTIVITY REPORT", pdf.margin_left + 10, piv_y + piv_h - 14, font="F2", size=9, r=1, g=1, b=1)

# Left Column: Pivot breakdown sample
pdf.draw_text("SUB-DISPOSITION BREAKDOWN:", pdf.margin_left + 12, piv_y + piv_h - 34, font="F2", size=8, r=0.15, g=0.45, b=0.85)
prows = [
    ("Interested", "1,240 calls"),
    ("Connected to an executive", "820 calls"),
    ("Call back", "615 calls"),
    ("Need time to think", "410 calls"),
    ("Not Interested", "2,150 calls"),
    ("null (Agent missed tag)", "185 calls"),
    ("Grand Total", "5,420 calls")
]
py = piv_y + piv_h - 46
for lab, cnt in prows:
    is_gt = (lab == "Grand Total")
    if is_gt:
        pdf.set_fill_color(0.92, 0.95, 0.99)
        pdf.rect(pdf.margin_left + 10, py - 2, 230, 11, fill=True, stroke=False)
    pdf.draw_text(lab, pdf.margin_left + 14, py, font="F2" if is_gt else "F1", size=7.2, r=0.12 if is_gt else 0.25, g=0.18, b=0.3)
    pdf.draw_text(cnt, pdf.margin_left + 190, py, font="F2", size=7.2, r=0.996 if is_gt else 0.12, g=0.004 if is_gt else 0.18, b=0.408 if is_gt else 0.3)
    py -= 12.5

# Right Column: Connectivity Metrics
pdf.draw_text("CONNECTIVITY METRICS FORMULA:", pdf.margin_left + 265, piv_y + piv_h - 34, font="F2", size=8, r=0.06, g=0.72, b=0.5)
srows = [
    ("ANSWER_NULL Calls", "412", "Gateway Answer + CRM Null"),
    ("Connected Calls", "3,890", "CRM = 'Contacted'"),
    ("Total Dialed Calls", "8,420", "Total Dialed Phone Attempts"),
    ("Connectivity Rate", "46.20%", "Connected / Total Dialed * 100")
]
sy = piv_y + piv_h - 48
for metric, val, desc in srows:
    pdf.set_fill_color(0.96, 0.98, 1.0)
    pdf.rect(pdf.margin_left + 265, sy - 4, 250, 18, fill=True, stroke=True, line_width=0.4)
    pdf.draw_text(metric, pdf.margin_left + 272, sy + 4, font="F2", size=7.4, r=0.12, g=0.18, b=0.3)
    pdf.draw_text(val, pdf.margin_left + 460, sy + 4, font="F2", size=8.5, r=0.996, g=0.004, b=0.408)
    pdf.draw_text(desc, pdf.margin_left + 272, sy - 2.5, font="F1", size=6.5, r=0.45, g=0.5, b=0.6)
    sy -= 23

pdf.cursor_y -= (piv_h + 14)

# Dedicated 2-Step Save (8 PM) Workflow Box
save_h = 165
save_y = pdf.cursor_y - save_h
pdf.set_fill_color(0.98, 1.0, 0.98)
pdf.set_stroke_color(0.5, 0.85, 0.6)
pdf.rect(pdf.margin_left, save_y, pdf.usable_width, save_h, fill=True, stroke=True, line_width=1)

# Header
pdf.set_fill_color(0.06, 0.72, 0.5)
pdf.rect(pdf.margin_left, save_y + save_h - 22, pdf.usable_width, 22, fill=True, stroke=False)
pdf.draw_text("END-OF-DAY 8 PM SAVE: 2-STEP CONFIRMATION MODAL WORKFLOW", pdf.margin_left + 10, save_y + save_h - 15, font="F2", size=9, r=1, g=1, b=1)

steps_save = [
    ("Step 1: Single Page Button Click", "Click 'Save Daily Report (8 PM)' in green banner at bottom of tables."),
    ("Step 2: 2-Step Modal Review", "Modal popup appears displaying verified snapshot of today's performance:"),
    ("         - Report Date & Campaign", "Verify date picker (default: today's date) & selected campaign."),
    ("         - Total Calls & Dispositions", "Inspect total calls analyzed and category breakdown counts."),
    ("         - Connected Calls & Rate %", "Review final connectivity percentage before locking into master records."),
    ("Step 3: Single 'Confirm & Save' Click", "Click 'Confirm & Save' button — data is permanently written to database!"),
    ("Permanent Dual-Storage Execution", "Writes to Browser Storage (never lost on refresh) + Supabase Cloud Database.")
]

my = save_y + save_h - 38
for s_title, s_desc in steps_save:
    pdf.draw_text(s_title, pdf.margin_left + 14, my, font="F2", size=7.8, r=0.1, g=0.45, b=0.2)
    pdf.draw_text("-> " + s_desc, pdf.margin_left + 185, my, font="F1", size=7.5, r=0.25, g=0.3, b=0.35)
    my -= 16

pdf.cursor_y -= (save_h + 10)


# ================= PAGE 6: TOOL 7 (DAILY ANALYTICS TRACKER) =================
pdf.new_page()
pdf.add_top_banner("TOOL 7: DAILY ANALYTICS & MULTI-MONTH PERFORMANCE TRACKER", "Trend Analysis, Executive KPI Cards, Profit/Loss Visibility", "MODULE 7")

pdf.add_callout(
    "2-3 MONTHS CALL COMPARABILITY & PROFIT/LOSS TRACKING",
    "Monitor daily performance shifts over time, compare campaigns, analyze trend charts, and export master spreadsheets.",
    r_bg=0.96, g_bg=0.98, b_bg=1.0, r_border=0.75, g_border=0.85, b_border=0.98, r_accent=0.15, g_accent=0.45, b_accent=0.85
)

# 4 KPI Cards Mockup
kpi_h = 58
kpi_y = pdf.cursor_y - kpi_h
card_w = (pdf.usable_width - 30) / 4
kpis = [
    ("TOTAL DIALED", "142,580", "Overall Dial Attempts", (0.12, 0.18, 0.30)),
    ("CONNECTED CALLS", "68,430", "CRM Contacted calls", (0.996, 0.004, 0.408)),
    ("AVG. CONNECTIVITY", "48.00%", "Connected / Dialed", (0.06, 0.72, 0.5)),
    ("ANSWER_NULL CALLS", "4,120", "Gateway Ans, CRM Null", (0.95, 0.6, 0.1))
]

kx = pdf.margin_left
for title, val, sub, col in kpis:
    pdf.set_fill_color(1, 1, 1)
    pdf.set_stroke_color(0.85, 0.88, 0.92)
    pdf.rect(kx, kpi_y, card_w, kpi_h, fill=True, stroke=True, line_width=0.6)
    # Left accent bar
    pdf.set_fill_color(*col)
    pdf.rect(kx, kpi_y, 3.5, kpi_h, fill=True, stroke=False)
    pdf.draw_text(title, kx + 8, kpi_y + kpi_h - 12, font="F2", size=6.5, r=0.45, g=0.5, b=0.6)
    pdf.draw_text(val, kx + 8, kpi_y + kpi_h - 30, font="F2", size=13, r=col[0], g=col[1], b=col[2])
    pdf.draw_text(sub, kx + 8, kpi_y + 8, font="F1", size=6.0, r=0.5, g=0.55, b=0.6)
    kx += (card_w + 10)

pdf.cursor_y -= (kpi_h + 14)

# SVG Chart & Master Table Box
ch_h = 175
ch_y = pdf.cursor_y - ch_h
pdf.set_fill_color(1, 1, 1)
pdf.set_stroke_color(0.85, 0.88, 0.94)
pdf.rect(pdf.margin_left, ch_y, pdf.usable_width, ch_h, fill=True, stroke=True, line_width=0.8)

# Header
pdf.set_fill_color(0.94, 0.96, 0.99)
pdf.rect(pdf.margin_left, ch_y + ch_h - 20, pdf.usable_width, 20, fill=True, stroke=False)
pdf.draw_text("DAILY CALL VOLUME & CONNECTIVITY RATE TREND CHART", pdf.margin_left + 10, ch_y + ch_h - 14, font="F2", size=8.5, r=0.12, g=0.18, b=0.3)
pdf.draw_text("Filters: Last 7 Days  |  Last 30 Days  |  Last 90 Days  |  All Records", pdf.margin_left + 280, ch_y + ch_h - 14, font="F1", size=7.5, r=0.4, g=0.45, b=0.55)

# Mock Trend Chart Bars
chart_base_y = ch_y + 25
chart_w = pdf.usable_width - 40
chart_x = pdf.margin_left + 20

# Axis line
pdf.draw_line(chart_x, chart_base_y, chart_x + chart_w, chart_base_y, width=0.8, r=0.8, g=0.85, b=0.9)

sample_days = [
    ("Nov 01", 60, 32, "46%"),
    ("Nov 02", 75, 42, "49%"),
    ("Nov 03", 55, 28, "44%"),
    ("Nov 04", 85, 52, "51%"),
    ("Nov 05", 95, 60, "53%"),
    ("Nov 06", 90, 56, "52%"),
    ("Nov 07", 70, 38, "47%"),
    ("Nov 08", 80, 46, "50%")
]

bar_gap = chart_w / len(sample_days)
for i, (day, d_val, c_val, pct) in enumerate(sample_days):
    bx = chart_x + i * bar_gap + 10
    # Dialed bar (Navy)
    pdf.set_fill_color(0.12, 0.18, 0.30)
    pdf.rect(bx, chart_base_y, 14, d_val, fill=True, stroke=False)
    # Connected bar (Pink)
    pdf.set_fill_color(0.996, 0.004, 0.408)
    pdf.rect(bx + 15, chart_base_y, 14, c_val, fill=True, stroke=False)
    # Day label
    pdf.draw_text(day, bx + 4, chart_base_y - 10, font="F1", size=6.5, r=0.4, g=0.45, b=0.55)
    # Connectivity line/pct label
    pdf.draw_text(pct, bx + 10, chart_base_y + d_val + 4, font="F2", size=6.5, r=0.06, g=0.72, b=0.5)

pdf.cursor_y -= (ch_h + 10)


# ================= PAGE 7: SUPABASE CLOUD & VERCEL DEPLOYMENT =================
pdf.new_page()
pdf.add_top_banner("SUPABASE CLOUD DATABASE & VERCEL HOSTING GUIDE", "Production Database Schema, Environment Variables, and Serverless Setup", "DATABASE & DEPLOY")

# Supabase SQL Box
sql_h = 175
sql_y = pdf.cursor_y - sql_h
pdf.set_fill_color(0.985, 0.99, 1.0)
pdf.set_stroke_color(0.75, 0.85, 0.95)
pdf.rect(pdf.margin_left, sql_y, pdf.usable_width, sql_h, fill=True, stroke=True, line_width=0.8)

# Header
pdf.set_fill_color(0.12, 0.18, 0.30)
pdf.rect(pdf.margin_left, sql_y + sql_h - 20, pdf.usable_width, 20, fill=True, stroke=False)
pdf.draw_text("SUPABASE PRODUCTION DATABASE SETUP (SQL EDITOR)", pdf.margin_left + 10, sql_y + sql_h - 14, font="F2", size=8.5, r=1, g=1, b=1)

sql_lines = [
    "-- 1. Create table daily_analytics (Handles complete 8 PM daily records)",
    "CREATE TABLE IF NOT EXISTS daily_analytics (",
    "  id              TEXT PRIMARY KEY,              -- Format: YYYY-MM-DD_CAMPAIGN",
    "  report_date     DATE NOT NULL,",
    "  campaign        TEXT DEFAULT 'All campaigns',",
    "  dialed          INTEGER DEFAULT 0,",
    "  connected       INTEGER DEFAULT 0,",
    "  connectivity    FLOAT DEFAULT 0,",
    "  answer_null     INTEGER DEFAULT 0,",
    "  dispositions    JSONB DEFAULT '{}'::jsonb,     -- Complete Sub-Disposition breakdown",
    "  created_at      TIMESTAMPTZ DEFAULT NOW()",
    ");",
    "",
    "-- 2. Disable Row Level Security (Backend handles HMAC-SHA256 authenticated access)",
    "ALTER TABLE daily_analytics DISABLE ROW LEVEL SECURITY;"
]

sq_y = sql_y + sql_h - 32
for line in sql_lines:
    is_comm = line.startswith("--")
    is_kw = any(line.strip().startswith(kw) for kw in ["CREATE", "ALTER"])
    pdf.draw_text(line, pdf.margin_left + 14, sq_y, font="F2" if is_kw else "F1", size=6.8, r=0.4 if is_comm else (0.1 if is_kw else 0.2), g=0.5 if is_comm else (0.3 if is_kw else 0.3), b=0.6 if is_comm else (0.7 if is_kw else 0.4))
    sq_y -= 10.5

pdf.cursor_y -= (sql_h + 12)

# Vercel Configuration Box
v_h = 160
v_y = pdf.cursor_y - v_h
pdf.set_fill_color(1, 1, 1)
pdf.set_stroke_color(0.85, 0.88, 0.94)
pdf.rect(pdf.margin_left, v_y, pdf.usable_width, v_h, fill=True, stroke=True, line_width=0.8)

# Header
pdf.set_fill_color(0.996, 0.004, 0.408)
pdf.rect(pdf.margin_left, v_y + v_h - 20, pdf.usable_width, 20, fill=True, stroke=False)
pdf.draw_text("VERCEL CLOUD DEPLOYMENT & ENVIRONMENT VARIABLES SETTINGS", pdf.margin_left + 10, v_y + v_h - 14, font="F2", size=8.5, r=1, g=1, b=1)

v_settings = [
    ("Framework Preset", "Other (Custom Static + Serverless)"),
    ("Root Directory", "./ (Repository root where vercel.json resides)"),
    ("Build Command", "cd frontend && npm install --include=dev && npm run build"),
    ("Output Directory", "frontend/dist")
]

vy = v_y + v_h - 34
for k, val in v_settings:
    pdf.draw_text(k + ":", pdf.margin_left + 12, vy, font="F2", size=7.8, r=0.12, g=0.18, b=0.3)
    pdf.draw_text(val, pdf.margin_left + 140, vy, font="F1", size=7.6, r=0.25, g=0.3, b=0.38)
    vy -= 14

pdf.draw_line(pdf.margin_left + 10, vy + 4, pdf.margin_left + pdf.usable_width - 10, vy + 4, width=0.5, r=0.85, g=0.88, b=0.92)
vy -= 8

pdf.draw_text("5 MANDATORY ENVIRONMENT VARIABLES (Project Settings -> Environment Variables):", pdf.margin_left + 12, vy, font="F2", size=8, r=0.996, g=0.004, b=0.408)
vy -= 14

env_rows = [
    ("ADMIN_USER", "Admin", "Username for application login"),
    ("ADMIN_PASS", "Admin@123", "Strong password for authentication"),
    ("SESSION_SECRET", "32+ char secret string", "Key used to sign HMAC-SHA256 session cookies"),
    ("SUPABASE_URL", "https://coqzqvrkcrvodmbntlkf.supabase.co", "Supabase project REST endpoint"),
    ("SUPABASE_KEY", "sb_secret_TBZAT... (Secret Key)", "Backend Secret Key for database read/write access")
]

for ev, ex, purp in env_rows:
    pdf.draw_text(ev, pdf.margin_left + 14, vy, font="F2", size=7.2, r=0.15, g=0.45, b=0.85)
    pdf.draw_text(ex, pdf.margin_left + 130, vy, font="F1", size=7.0, r=0.4, g=0.45, b=0.5)
    pdf.draw_text(purp, pdf.margin_left + 330, vy, font="F1", size=7.0, r=0.25, g=0.3, b=0.35)
    vy -= 12

pdf.cursor_y -= (v_h + 10)


# ================= PAGE 8: PIPELINE & QA TROUBLESHOOTING =================
pdf.new_page()
pdf.add_top_banner("END-TO-END PIPELINE & QA TROUBLESHOOTING MATRIX", "Operational Workflow Architecture & Common Issue Resolutions", "PIPELINE & QA")

# Pipeline Flow Box
pl_h = 120
pl_y = pdf.cursor_y - pl_h
pdf.set_fill_color(0.985, 0.99, 1.0)
pdf.set_stroke_color(0.8, 0.85, 0.92)
pdf.rect(pdf.margin_left, pl_y, pdf.usable_width, pl_h, fill=True, stroke=True, line_width=1)
# Header
pdf.set_fill_color(0.12, 0.18, 0.30)
pdf.rect(pdf.margin_left, pl_y + pl_h - 18, pdf.usable_width, 18, fill=True, stroke=False)
pdf.draw_text("END-TO-END DAILY OPERATIONAL WORKFLOW PIPELINE", pdf.margin_left + 10, pl_y + pl_h - 13, font="F2", size=8.5, r=1, g=1, b=1)

pipeline = [
    ("1. Dial Portal (msl.waanee.ai)", "Direct API Fetch or Download Raw CDR CSV"),
    ("2. Tool 4 (Answer Null CDR)", "Segregate Answered calls missing CRM status for immediate re-dialing"),
    ("3. Tool 5 (Lead Generator)", "Format leads into standardized 57-column CRM upload template"),
    ("4. Tool 1 (Remark Adder)", "Add agent remarks / QA feedback to Interested leads"),
    ("5. Tool 2 -> Tool 3", "Convert to JSON payload and POST to CRM endpoint via SSRF Proxy"),
    ("6. Tool 6 (Sub-Dispo Pivot)", "Automated Pivot table + WhatsApp screenshot + Connectivity %"),
    ("7. 8 PM Save -> Tool 7", "2-Step confirmation save to Supabase Cloud + Multi-month comparative dashboard")
]

ply = pl_y + pl_h - 30
for step_num, step_desc in pipeline:
    pdf.draw_text(step_num, pdf.margin_left + 14, ply, font="F2", size=7.4, r=0.996, g=0.004, b=0.408)
    pdf.draw_text("-> " + step_desc, pdf.margin_left + 145, ply, font="F1", size=7.2, r=0.2, g=0.25, b=0.32)
    ply -= 12.5

pdf.cursor_y -= (pl_h + 12)

# Troubleshooting Matrix Table
qa_h = 205
qa_y = pdf.cursor_y - qa_h
pdf.set_fill_color(1, 1, 1)
pdf.set_stroke_color(0.85, 0.88, 0.92)
pdf.rect(pdf.margin_left, qa_y, pdf.usable_width, qa_h, fill=True, stroke=True, line_width=0.8)

# Header
pdf.set_fill_color(0.92, 0.94, 0.98)
pdf.rect(pdf.margin_left, qa_y + qa_h - 18, pdf.usable_width, 18, fill=True, stroke=False)
pdf.draw_text("Observed Issue", pdf.margin_left + 10, qa_y + qa_h - 13, font="F2", size=8, r=0.12, g=0.18, b=0.3)
pdf.draw_text("Probable Root Cause", pdf.margin_left + 175, qa_y + qa_h - 13, font="F2", size=8, r=0.12, g=0.18, b=0.3)
pdf.draw_text("Exact Solution", pdf.margin_left + 355, qa_y + qa_h - 13, font="F2", size=8, r=0.12, g=0.18, b=0.3)

troubleshoot = [
    ("Page refresh resets data", "Supabase environment variables not saved in Vercel", "Add SUPABASE_URL & SUPABASE_KEY in Vercel Settings and Redeploy"),
    ("Columns not found error", "Raw CDR file has non-standard header names", "Verify headers match: CAMPAIGN NAME, CRM SUB-DISPOSITION"),
    ("No rows matched filter", "Campaign name spelling or uppercase/lowercase mismatch", "Select from Campaign filter dropdown (case-insensitive auto match)"),
    ("API Error 400 (Private IP)", "Target API URL points to localhost or private IP range", "Use public HTTPS domain. SSRF security blocks private internal IPs"),
    ("Vercel build fails at root", "Vercel framework was set to Vite instead of Other", "Set Framework: Other and Root Directory: ./ in Vercel settings"),
    ("Function maxDuration error", "Free Vercel Hobby plan limit exceeded (>10s)", "Leave function configuration at default (Hobby plan auto-executes)"),
    ("Screenshot Ctrl+V disabled", "Browser permission blocked writing image to clipboard", "Click 'Download screenshot (PNG)' button to save directly to disk"),
    ("Login session expired", "12-hour session timeout reached (SESSION_MAX_AGE)", "Re-enter admin credentials on official Waanee AI login screen")
]

qy = qa_y + qa_h - 32
for iss, cause, sol in troubleshoot:
    pdf.draw_text(iss, pdf.margin_left + 10, qy, font="F2", size=6.8, r=0.75, g=0.15, b=0.15)
    pdf.draw_text(cause, pdf.margin_left + 175, qy, font="F1", size=6.8, r=0.25, g=0.3, b=0.38)
    pdf.draw_text(sol, pdf.margin_left + 355, qy, font="F1", size=6.8, r=0.1, g=0.45, b=0.2)
    pdf.draw_line(pdf.margin_left + 8, qy - 4, pdf.margin_left + pdf.usable_width - 8, qy - 4, width=0.4, r=0.9, g=0.92, b=0.96)
    qy -= 18

pdf.cursor_y -= (qa_h + 8)

# Output build
target_pdf = "d:\\Wannee-Ai\\Converter\\MTF-Toolkit - Copy\\CDR_Toolkit_User_Manual.pdf"
pdf.build(target_pdf)
