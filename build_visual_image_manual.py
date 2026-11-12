import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from PIL import Image as PILImage

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            # First page has full cover header banner
            return

        # Running header
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(45, 800, "CDR Toolkit - User Manual")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.6)
        self.line(45, 792, 550, 792)

        # Running footer
        self.line(45, 42, 550, 42)
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawRightString(550, 30, f"Page {self._pageNumber}")
        self.restoreState()

def create_numbered_step(num, text, styles):
    # Step badge + text table
    badge_style = ParagraphStyle(
        'StepBadge',
        fontName='Helvetica-Bold',
        fontSize=11,
        textColor=colors.white,
        alignment=1, # Centered
        leading=13
    )
    text_style = ParagraphStyle(
        'StepText',
        fontName='Helvetica',
        fontSize=9.2,
        textColor=colors.HexColor("#0f172a"),
        leading=13.5
    )
    p_badge = Paragraph(f"<b>{num}</b>", badge_style)
    p_text = Paragraph(text, text_style)
    t = Table([[p_badge, p_text]], colWidths=[20, 485])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), colors.HexColor("#0284c7")),
        ('ALIGN', (0,0), (0,0), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 1),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
        ('LEFTPADDING', (0,0), (0,0), 0),
        ('RIGHTPADDING', (0,0), (0,0), 0),
        ('LEFTPADDING', (1,0), (1,0), 8),
    ]))
    return t

def make_callout_box(title, text_lines, bg="#eff6ff", border="#bfdbfe", title_col="#1d4ed8"):
    body = []
    if title:
        body.append(f"<font color='{title_col}'><b>{title}</b></font>")
    if isinstance(text_lines, list):
        body.extend(text_lines)
    else:
        body.append(text_lines)
    
    html = "<br/>".join(body)
    style = ParagraphStyle('Callout', fontName='Helvetica', fontSize=8.4, leading=12, textColor=colors.HexColor("#1e293b"))
    p = Paragraph(html, style)
    t = Table([[p]], colWidths=[505])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(bg)),
        ('BOX', (0,0), (-1,-1), 0.8, colors.HexColor(border)),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    return t

def get_proportional_image(path, target_width=505, max_height=260):
    if not os.path.exists(path):
        return None
    try:
        with PILImage.open(path) as img:
            orig_w, orig_h = img.size
        
        ratio = target_width / float(orig_w)
        target_h = orig_h * ratio
        if target_h > max_height:
            target_h = max_height
            target_width = orig_w * (max_height / float(orig_h))
        
        # Center the image inside a table with a subtle border
        rl_img = RLImage(path, width=target_width, height=target_h)
        caption_style = ParagraphStyle('ImgCaption', fontName='Helvetica', fontSize=8, textColor=colors.HexColor("#64748b"), alignment=1)
        
        t = Table([[rl_img]], colWidths=[505])
        t.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 4),
            ('RIGHTPADDING', (0,0), (-1,-1), 4),
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ]))
        return t
    except Exception as e:
        print(f"Error loading image {path}: {e}")
        return None

def build_pdf(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=45,
        rightMargin=45,
        topMargin=45,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()
    
    # Custom styles matching user's PDF
    h1_style = ParagraphStyle('CustomH1', fontName='Helvetica-Bold', fontSize=20, textColor=colors.HexColor("#0284c7"), leading=24, spaceAfter=8)
    h2_style = ParagraphStyle('CustomH2', fontName='Helvetica-Bold', fontSize=14, textColor=colors.HexColor("#0f172a"), leading=18, spaceBefore=6, spaceAfter=4)
    h3_style = ParagraphStyle('CustomH3', fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor("#0f172a"), leading=14, spaceBefore=4, spaceAfter=2)
    body_style = ParagraphStyle('CustomBody', fontName='Helvetica', fontSize=9, textColor=colors.HexColor("#334155"), leading=13)
    caption_style = ParagraphStyle('Caption', fontName='Helvetica', fontSize=8, textColor=colors.HexColor("#64748b"), alignment=1, spaceBefore=4, spaceAfter=8)
    code_style = ParagraphStyle('CodeText', fontName='Courier', fontSize=7.8, textColor=colors.HexColor("#0f172a"), leading=10.5)

    story = []

    # ================= PAGE 1: COVER =================
    # Blue Header block
    title_p = Paragraph("<font size=28 color='white'><b>CDR Toolkit</b></font><br/><br/><font size=14 color='white'>User Manual</font>", ParagraphStyle('CoverTitle', fontName='Helvetica', leading=26))
    header_table = Table([[title_p]], colWidths=[505], rowHeights=[170])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#0284c7")),
        ('LEFTPADDING', (0,0), (-1,-1), 24),
        ('BOTTOMPADDING', (0,0), (-1,-1), 24),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 40))

    story.append(Paragraph("<b>A simple step-by-step guide to the seven converters</b>", ParagraphStyle('CoverSub', fontName='Helvetica-Bold', fontSize=13, textColor=colors.HexColor("#0f172a"))))
    story.append(Spacer(1, 10))
    story.append(Paragraph("This manual shows how to use each tool, what file it needs, and what you get at the end. Every step has a screenshot, so anyone can follow it without technical knowledge.", body_style))
    story.append(Spacer(1, 24))

    story.append(Paragraph("<b>What is inside</b>", h2_style))
    story.append(Spacer(1, 6))

    toc_data = [
        [Paragraph("<b>No.</b>", body_style), Paragraph("<b>Tool</b>", body_style), Paragraph("<b>Use it to</b>", body_style)],
        ["1", "Remark Adder", "Add remarks to Interested / Connected calls and export Excel"],
        ["2", "Excel to JSON", "Turn an Excel or CSV file into JSON"],
        ["3", "API Request Sender", "Send that JSON to an API through secure proxy and see the reply"],
        ["4", "Download Answer Null CDR", "Filter a CDR file down to Answer + empty disposition rows"],
        ["5", "Answer Null Lead Data", "Build the Answer Null upload file from Lead Data (57 columns)"],
        ["6", "Sub-Disposition Pivot", "Dial Portal API Fetch or CSV drop, Pivot table, and 8 PM Save"],
        ["7", "Daily Analytics Tracker", "Compare 2-3 months trends, profit/loss, KPI cards, and Supabase cloud"]
    ]
    t_toc = Table(toc_data, colWidths=[35, 170, 300])
    t_toc.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('FONTNAME', (0,1), (0,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8.5),
    ]))
    story.append(t_toc)

    story.append(Spacer(1, 90))
    story.append(Paragraph("Version 2.0 | November 2026", ParagraphStyle('Ver', fontName='Helvetica', fontSize=9, textColor=colors.HexColor("#64748b"))))
    story.append(PageBreak())

    # ================= PAGE 2: GETTING STARTED =================
    story.append(Paragraph("Getting started", h1_style))
    story.append(Paragraph("Do these three things once. After that, just pick a tool from the menu.", body_style))
    story.append(Spacer(1, 10))

    story.append(create_numbered_step("1", "Open the website address given to you by your administrator. Chrome or Edge is recommended.", styles))
    story.append(Spacer(1, 6))
    story.append(create_numbered_step("2", "Type the <b>username</b> and <b>password</b> you were given and click <b>LOG IN</b>. You stay logged in for <b>12 hours</b> (Stateless authentication). Click <b>Log out</b> (top right) when you finish.", styles))
    story.append(Spacer(1, 8))

    img_p2_1 = get_proportional_image("manual_images/p2_1_FormXob.990476f331ad253316ec72308e11dba3.jpg", max_height=140)
    if img_p2_1:
        story.append(img_p2_1)
        story.append(Paragraph("Figure 1: The login page", caption_style))

    story.append(Spacer(1, 6))
    story.append(create_numbered_step("3", "Click a tool in the menu on the left (on a phone the menu is at the top). The tool opens on the right.", styles))
    story.append(Spacer(1, 8))

    img_p2_2 = get_proportional_image("manual_images/p2_2_FormXob.9e29f0097096a8c987aa91b29ee8ba3b.jpg", max_height=150)
    if img_p2_2:
        story.append(img_p2_2)
        story.append(Paragraph("Figure 2: The toolkit: menu on the left, selected tool on the right", caption_style))

    story.append(Spacer(1, 6))
    story.append(make_callout_box("Good to know", [
        "- Your files are read inside your own browser memory. They are <b>not uploaded</b> to any external server.",
        "- Multi-user support: Unlimited team members can log in simultaneously with zero lag.",
        "- If a download does not start, allow downloads for this site in your browser settings."
    ]))
    story.append(PageBreak())

    # ================= PAGE 3: TOOL 1 =================
    story.append(Paragraph("Tool 1: Remark Adder", h1_style))
    story.append(Paragraph("Menu name: Disposition Remark Converter", ParagraphStyle('MName', fontName='Helvetica', fontSize=8.5, textColor=colors.HexColor("#64748b"))))
    story.append(Spacer(1, 8))

    story.append(make_callout_box("What it does", "Reads a CDR file, keeps only the <b>MTF-CROSS SELL</b> calls whose CRM SUB-DISPOSITION is <b>Interested</b> or <b>Connected to an executive</b>, adds a <b>Remark</b> column from the list you paste, and downloads an Excel file.", bg="#f8fafc", border="#e2e8f0", title_col="#0f172a"))
    story.append(Spacer(1, 6))
    story.append(make_callout_box("You need", [
        "- A CDR file in <b>.csv</b> format with the columns CAMPAIGN NAME, CRM SUB-DISPOSITION and RECORD ID",
        "- A list of Record IDs with their remarks (typed or pasted)"
    ], bg="#f8fafc", border="#e2e8f0", title_col="#0f172a"))
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>Steps</b>", h2_style))
    story.append(Spacer(1, 6))
    story.append(create_numbered_step("1", "In box 1 click <b>Choose File</b> and select your CDR CSV. A green line shows the counts: total rows, MTF-CROSS SELL rows, and the final rows kept. Boxes 2 and 3 are greyed out until a valid file is loaded.", styles))
    story.append(Spacer(1, 8))

    img_p3_1 = get_proportional_image("manual_images/p3_1_FormXob.1d25fde87dce4b7d07bf0e0c176bc13a.png", max_height=180)
    if img_p3_1:
        story.append(img_p3_1)
        story.append(Paragraph("Figure 3: Step 1: file loaded and filtered", caption_style))

    story.append(Spacer(1, 6))
    story.append(create_numbered_step("2", "In box 2 type or paste the remarks. Write the <b>remark on one line</b>, then the <b>lead_id lines</b> that belong to it underneath. A line like <b>123 [Tab] remark</b> also works. The tool tells you how many IDs found a remark.", styles))
    story.append(PageBreak())

    # ================= PAGE 4: TOOL 1 (CONTINUED) =================
    img_p4_1 = get_proportional_image("manual_images/p4_1_FormXob.508930d280e5d50caa21fbf9deb060c9.png", max_height=200)
    if img_p4_1:
        story.append(img_p4_1)
        story.append(Paragraph("Figure 4: Steps 2 and 3: remarks pasted, counts shown under the buttons", caption_style))

    story.append(Spacer(1, 10))
    story.append(create_numbered_step("3", "In box 3 choose the <b>file date</b> (used in the file name), then click a button:", styles))
    story.append(Spacer(1, 8))

    btn_data = [
        [Paragraph("<b>Button</b>", body_style), Paragraph("<b>What you get</b>", body_style), Paragraph("<b>Example file name</b>", body_style)],
        ["Interested only", "Rows whose remark is Interested", "4_Nov_MTF_Interested.xlsx"],
        ["Connected to an executive only", "Rows whose remark is Connected to an executive", "4_Nov_MTF_Genuine_Connected_To_Executive.xlsx"],
        ["Download both files", "One file with all filtered rows and the Remark column", "4_Nov_MTF_Updated_Disposition.xlsx"]
    ]
    t_btn = Table(btn_data, colWidths=[120, 195, 190])
    t_btn.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('FONTNAME', (0,1), (0,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
    ]))
    story.append(t_btn)

    story.append(Spacer(1, 14))
    story.append(make_callout_box("Tips", [
        "- The Remark column is added as the last column of the Excel file.",
        "- For the two 'only' buttons the remark text must be exactly <b>Interested</b> or <b>Connected to an executive</b> (capital letters do not matter).",
        "- IDs you pasted that are not in the filtered file are listed as ignored."
    ]))
    story.append(PageBreak())

    # ================= PAGE 5: TOOL 2 =================
    story.append(Paragraph("Tool 2: Excel to JSON", h1_style))
    story.append(Spacer(1, 6))

    story.append(make_callout_box("What it does", "Converts each row of an Excel or CSV file into a JSON record with <b>lead_id</b>, <b>call_id</b>, <b>sub_disposition</b>, <b>disposition</b> and <b>summary</b>. Copy it or download it as a .json file.", bg="#f8fafc", border="#e2e8f0", title_col="#0f172a"))
    story.append(Spacer(1, 6))
    story.append(make_callout_box("You need", [
        "- An <b>.xlsx</b> or <b>.csv</b> file with a lead / record ID column and a call ID column",
        "- Optional: a remark column and a Call_description column"
    ], bg="#f8fafc", border="#e2e8f0", title_col="#0f172a"))
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>Steps</b>", h2_style))
    story.append(Spacer(1, 6))
    story.append(create_numbered_step("1", "Click the box or drag your file onto it. If the workbook has several sheets, a <b>Sheet</b> list appears; pick one.", styles))
    story.append(Spacer(1, 6))
    story.append(create_numbered_step("2", "Under <b>Map the columns</b> check each list. The tool picks columns by name automatically (for example Record ID, Call ID, Remark, Call_description). Change a list if it picked the wrong column.", styles))
    story.append(Spacer(1, 8))

    img_p5_1 = get_proportional_image("manual_images/p5_1_FormXob.66b2dcefb0b6772d192c341f112f7440.png", max_height=170)
    if img_p5_1:
        story.append(img_p5_1)
        story.append(Paragraph("Figure 5: Columns mapped on the left, JSON result on the right", caption_style))

    story.append(Spacer(1, 6))
    fld_data = [
        [Paragraph("<b>Field</b>", body_style), Paragraph("<b>Required?</b>", body_style), Paragraph("<b>Comes from</b>", body_style)],
        ["lead_id", "Yes", "Column of your file (e.g. Record ID)"],
        ["call_id", "Yes", "Column of your file (e.g. Call ID)"],
        ["disposition", "Yes", "You type one value for every record (default: Contacted)"],
        ["sub_disposition", "No", "Column of your file (e.g. Remark). Choose (none) to leave it out"],
        ["summary", "No", "Column Call_description. Choose (none) to leave it out"]
    ]
    t_fld = Table(fld_data, colWidths=[95, 60, 350])
    t_fld.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('FONTSIZE', (0,0), (-1,-1), 7.8),
    ]))
    story.append(t_fld)
    story.append(Spacer(1, 6))

    story.append(create_numbered_step("3", "Click <b>Copy JSON</b> or <b>Download .json</b>. The line above the box shows how many records were converted and how many were skipped.", styles))
    story.append(PageBreak())

    # ================= PAGE 6: TOOL 2 EXAMPLE & TOOL 3 =================
    story.append(Paragraph("Example result", h2_style))
    sample_json = """[\n  {\n    "lead_id": 1001,\n    "call_id": "0910-1",\n    "sub_disposition": "Interested",\n    "disposition": "Contacted",\n    "summary": "Customer asked for a call back"\n  }\n]"""
    p_code = Paragraph(f"<pre>{sample_json}</pre>", code_style)
    t_code = Table([[p_code]], colWidths=[505])
    t_code.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_code)
    story.append(Spacer(1, 10))

    story.append(make_callout_box("Rules to remember", [
        "- Rows with no lead_id or no call_id are skipped.",
        "- If a call_id appears more than once, only the first row is kept.",
        "- A leading apostrophe in call_id is removed, and lead_id becomes a number when possible.",
        "- Rows with an empty sub_disposition are skipped unless you tick <b>Include rows with an empty sub_disposition</b>."
    ]))
    story.append(Spacer(1, 16))

    # Tool 3 starts here
    story.append(Paragraph("Tool 3: API Request Sender", h1_style))
    story.append(make_callout_box("What it does", "Sends a request to an API address through the backend proxy server and shows the reply (status, time, size, body and headers). It works like Postman. Use it to send the JSON from Tool 2.", bg="#f8fafc", border="#e2e8f0", title_col="#0f172a"))
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>Steps</b>", h2_style))
    story.append(create_numbered_step("1", "Choose the <b>method</b> (for example POST) and type the full <b>URL</b> starting with https://.", styles))
    story.append(Spacer(1, 4))
    story.append(create_numbered_step("2", "If the API needs a login, choose the <b>Authorization</b> type (Bearer Token, Basic Auth or API Key). If no login is needed, choose <b>No Auth</b>.", styles))
    story.append(Spacer(1, 4))
    story.append(create_numbered_step("3", "Keep the <b>Headers</b> as they are (Content-Type: application/json) unless your API needs custom headers.", styles))
    story.append(Spacer(1, 4))
    story.append(create_numbered_step("4", "In <b>Body</b> type your JSON, or click <b>Use JSON from converter</b> to load the result of Tool 2. <b>Format JSON</b> tidies the text.", styles))
    story.append(Spacer(1, 4))
    story.append(create_numbered_step("5", "Click <b>Send</b>. The reply appears below. A green badge such as <b>200 OK</b> means success. Use Body and Headers tabs to switch views.", styles))
    story.append(PageBreak())

    # ================= PAGE 7: TOOL 3 (SCREENSHOT) & TOOL 4 =================
    img_p7_1 = get_proportional_image("manual_images/p7_1_FormXob.ae5e8ff14689cd0de9785c978bb2625f.png", max_height=180)
    if img_p7_1:
        story.append(img_p7_1)
        story.append(Paragraph("Figure 6: A request and its reply (example)", caption_style))

    story.append(Spacer(1, 8))
    story.append(make_callout_box("Limits and tips", [
        "- It cannot reach private or local addresses such as localhost or 192.168.x.x. SSRF security blocks them. Use a public URL.",
        "- A request waits up to 30 seconds. Replies up to 4 MB are shown.",
        "- Be careful with methods that change data (POST, PUT, DELETE) on live systems. The tool shows a warning for them."
    ]))
    story.append(Spacer(1, 14))

    # Tool 4 starts here
    story.append(Paragraph("Tool 4: Download Answer Null CDR", h1_style))
    story.append(make_callout_box("What it does", "Filters a CDR file by campaign and gateway disposition, keeps the rows where <b>CRM DISPOSITION is empty</b>, and downloads the result as Excel.", bg="#f8fafc", border="#e2e8f0", title_col="#0f172a"))
    story.append(Spacer(1, 6))
    story.append(make_callout_box("You need", "- A CDR file in <b>.csv</b> format with the columns CAMPAIGN NAME, GATEWAY DISPOSITION and CRM DISPOSITION", bg="#f8fafc", border="#e2e8f0", title_col="#0f172a"))
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>Steps</b>", h2_style))
    story.append(create_numbered_step("1", "Drop the CSV on the box or click it. After loading, the box turns green and shows the file name with its rows and columns.", styles))
    story.append(Spacer(1, 4))
    story.append(create_numbered_step("2", "Check the filters. They start as <b>MTF-CROSS SELL</b> and <b>ANSWER</b>; change them if needed. Choose what to do with CRM DISPOSITION:", styles))
    story.append(Spacer(1, 6))

    opt_data = [
        [Paragraph("<b>Option</b>", body_style), Paragraph("<b>Result</b>", body_style)],
        ["Keep null rows only (default)", "Only rows where CRM DISPOSITION is empty"],
        ["Clear the column", "All rows kept, CRM DISPOSITION values removed"],
        ["Do nothing", "CRM DISPOSITION stays as it is"]
    ]
    t_opt = Table(opt_data, colWidths=[180, 325])
    t_opt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('FONTSIZE', (0,0), (-1,-1), 8),
    ]))
    story.append(t_opt)
    story.append(PageBreak())

    # ================= PAGE 8: TOOL 4 (SCREENSHOTS) & TOOL 5 =================
    img_p8_1 = get_proportional_image("manual_images/p8_1_FormXob.1b4ace56e3ff61153b6a3efafb945eb4.png", max_height=140)
    if img_p8_1:
        story.append(img_p8_1)
        story.append(Paragraph("Figure 7: Steps 1 and 2: file loaded, filters set", caption_style))

    story.append(Spacer(1, 6))
    story.append(create_numbered_step("3", "Click <b>Convert & Download XLSX</b>. The boxes show the row count after each filter (Total, Campaign, Gateway, Final) and a preview of the first 5 rows. The file is saved as <b>yourfilename_filtered.xlsx</b>.", styles))
    story.append(Spacer(1, 6))

    img_p9_1 = get_proportional_image("manual_images/p9_1_FormXob.a3643d14f8ba842034528e47d79a930b.png", max_height=130)
    if img_p9_1:
        story.append(img_p9_1)
        story.append(Paragraph("Figure 8: Step 3: counts after each filter and a preview", caption_style))

    story.append(Spacer(1, 6))
    story.append(make_callout_box("Tips", [
        "- 'Empty' means blank, null, nan or none.",
        "- Capital letters, extra spaces, hyphens and underscores are ignored when matching names.",
        "- If no rows are left, check the spelling of the campaign and gateway filters."
    ]))
    story.append(Spacer(1, 10))

    # Tool 5 starts here
    story.append(Paragraph("Tool 5: Answer Null Lead Data", h1_style))
    story.append(make_callout_box("What it does", "Turns a Lead Data Excel file into the <b>Answer Null</b> file, which has a fixed set of <b>57 columns</b>.", bg="#f8fafc", border="#e2e8f0", title_col="#0f172a"))
    story.append(PageBreak())

    # ================= PAGE 9: TOOL 5 (SCREENSHOT) & TOOL 6 INTRO =================
    story.append(make_callout_box("You need", [
        "- An <b>.xlsx</b> file with the columns CUSTOMER NAME, RECORD ID, Remark, CALL ID, CALL ATTEMPT, CAMPAIGN NAME and GATEWAY DISPOSITION",
        "- Optional: CALL START TIME (used for the file name)"
    ], bg="#f8fafc", border="#e2e8f0", title_col="#0f172a"))
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>Steps</b>", h2_style))
    story.append(create_numbered_step("1", "Click the box or drop your Excel file. The file name appears and the message <b>File ready</b> is shown.", styles))
    story.append(Spacer(1, 4))
    story.append(create_numbered_step("2", "Set <b>date_entered</b> (date and time). Every row gets this value. All other fixed columns stay the same.", styles))
    story.append(Spacer(1, 6))

    img_p10_1 = get_proportional_image("manual_images/p10_1_FormXob.9dc5228931ed290a74c19dd8ae732510.png", max_height=140)
    if img_p10_1:
        story.append(img_p10_1)
        story.append(Paragraph("Figure 9: File ready; set date_entered and click Convert", caption_style))

    story.append(Spacer(1, 6))
    story.append(create_numbered_step("3", "Click <b>Convert & Download</b>. A message tells you how many rows were converted and the file name.", styles))
    story.append(Spacer(1, 6))

    story.append(make_callout_box("Which rows are used & What you get", [
        "- <b>Rows filtered:</b> Remark is not empty, campaign is MTF-CROSS SELL and gateway disposition is ANSWER.",
        "- <b>File name:</b> 4_Nov_MTF_ANSWER_NULL.xlsx (date comes from CALL START TIME or date_entered).",
        "- <b>Filled columns:</b> id (1, 2, 3...), full_name, parent_id (Record ID), sub_disposition (Remark), call_id, call_attempt_number and date_entered."
    ]))
    story.append(Spacer(1, 10))

    # Tool 6 Header
    story.append(Paragraph("Tool 6: Sub-Disposition Pivot Converter", h1_style))
    story.append(make_callout_box("What it does", "Counts calls for each CRM SUB-DISPOSITION of a campaign (a pivot table), shows a connectivity summary, and lets you <b>save the daily performance report to the master database</b>.", bg="#f8fafc", border="#e2e8f0", title_col="#0f172a"))
    story.append(PageBreak())

    # ================= PAGE 10: TOOL 6 DUAL MODE (PORTAL API FETCH) =================
    story.append(Paragraph("Tool 6: Dual Mode (Direct Dial Portal vs File Upload)", h2_style))
    story.append(Paragraph("You can use Tool 6 in two ways: by uploading a downloaded CSV, or by hitting the Dial Portal API directly without manual downloading.", body_style))
    story.append(Spacer(1, 8))

    img_portal = get_proportional_image("manual_images/tool6_dial_portal.jpg", max_height=180)
    if img_portal:
        story.append(img_portal)
        story.append(Paragraph("Figure 10: Direct Dial Portal API Fetch matching msl.waanee.ai/#/charts layout", caption_style))

    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>Portal Filter Controls & Action Buttons</b>", h3_style))
    portal_btn_data = [
        [Paragraph("<b>Control / Button</b>", body_style), Paragraph("<b>Function & Description</b>", body_style)],
        ["Call Type Dropdown", "Choose Predictive, Manual, Inbound, or All calls."],
        ["From Date & To Date", "Select exact datetime range for CDR extraction."],
        ["Campaign List", "Choose campaign: MTF-CROSS SELL, South Bot, etc."],
        ["Search (Pink Button)", "Directly queries dialer API, renders live CDR table, and builds Pivot report."],
        ["Clear (Green Button)", "Resets timestamps and campaign selection to defaults."],
        ["Export (Cyan Button)", "Downloads the raw CDR CSV file directly to your computer (just like portal Export)."]
    ]
    t_pbtn = Table(portal_btn_data, colWidths=[150, 355])
    t_pbtn.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('FONTNAME', (0,1), (0,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
    ]))
    story.append(t_pbtn)
    story.append(PageBreak())

    # ================= PAGE 11: TOOL 6 PIVOT & 8 PM SAVE =================
    story.append(Paragraph("Tool 6: Pivot Table & End-of-Day 8 PM Save", h2_style))
    story.append(create_numbered_step("1", "Drop your file on the box or click Search in API mode. The tool shows how many rows it loaded.", styles))
    story.append(Spacer(1, 4))
    story.append(create_numbered_step("2", "Pick the Campaign filter. The pivot table renders automatically with Grand Total.", styles))
    story.append(Spacer(1, 6))

    img_p11_1 = get_proportional_image("manual_images/p11_1_FormXob.e3232f6103e8b3e99761654c131772d3.png", max_height=130)
    if img_p11_1:
        story.append(img_p11_1)
        story.append(Paragraph("Figure 11: The pivot table with Grand Total and download buttons", caption_style))

    story.append(Spacer(1, 6))
    img_p12_1 = get_proportional_image("manual_images/p12_1_FormXob.043e43aa84aec15c032a1a33c31d7a18.png", max_height=110)
    if img_p12_1:
        story.append(img_p12_1)
        story.append(Paragraph("Figure 12: Call summary and connectivity metrics", caption_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>End-of-Day (8 PM) Save Workflow (2-Step Modal)</b>", h3_style))
    story.append(Paragraph("To maintain daily performance records and 2-3 months trend comparison:", body_style))
    story.append(Spacer(1, 4))
    story.append(create_numbered_step("3", "Click the single green button <b>Save Daily Report (8 PM)</b> at the bottom of the tables.", styles))
    story.append(Spacer(1, 4))
    story.append(create_numbered_step("4", "The <b>2-Step Confirmation Modal</b> opens showing a verified snapshot: Report Date, Campaign, Total Calls, Dispositions count, Connected Calls, and Connectivity %. Click <b>Confirm & Save</b>.", styles))
    story.append(Spacer(1, 6))
    story.append(make_callout_box("Permanent Storage Guarantee", [
        "- Data is locked in <b>Browser Permanent Storage (localStorage)</b> immediately (never lost on page refresh).",
        "- Data is automatically synced to <b>Supabase Cloud Database</b> for team-wide multi-computer access.",
        "- View full historical trends anytime in <b>Tool 7 (Daily Analytics Tracker)</b>."
    ], bg="#f0fdf4", border="#86efac", title_col="#166534"))
    story.append(PageBreak())

    # ================= PAGE 12: TOOL 7 DAILY ANALYTICS TRACKER =================
    story.append(Paragraph("Tool 7: Daily Analytics & Trends Tracker", h1_style))
    story.append(make_callout_box("What it does", "Maintains end-of-day reports saved from Tool 6 over 2-3 months. Provides executive KPI summary cards, interactive trend charts, profit/loss indicators, and master spreadsheet exports.", bg="#f8fafc", border="#e2e8f0", title_col="#0f172a"))
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>4 Executive Performance KPIs</b>", h2_style))
    kpi_tbl_data = [
        [Paragraph("<b>KPI Card</b>", body_style), Paragraph("<b>Formula / Definition</b>", body_style), Paragraph("<b>Business Value</b>", body_style)],
        ["Total Dialed Calls", "Sum of all dial attempts across campaign", "Monitors dialer capacity and agent effort."],
        ["Connected Calls", "CRM Contacted customer conversations", "Core productive customer touchpoints."],
        ["Avg. Connectivity %", "(Connected Calls / Total Dialed) * 100", "Key efficiency metric (Target: >45%)."],
        ["ANSWER_NULL Calls", "Gateway Answer + CRM Null", "Identifies dropped calls needing redial."]
    ]
    t_kpi = Table(kpi_tbl_data, colWidths=[130, 200, 175])
    t_kpi.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('FONTNAME', (0,1), (0,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
    ]))
    story.append(t_kpi)
    story.append(Spacer(1, 14))

    story.append(Paragraph("<b>Trend Filters & Master Export Features</b>", h2_style))
    story.append(create_numbered_step("1", "<b>Date Presets:</b> Switch between Last 7 Days, Last 30 Days, Last 90 Days, or All Records to observe long-term trends.", styles))
    story.append(Spacer(1, 4))
    story.append(create_numbered_step("2", "<b>Visual Chart:</b> Interactive bar/line chart displays daily call volume fluctuations alongside connectivity percentage.", styles))
    story.append(Spacer(1, 4))
    story.append(create_numbered_step("3", "<b>Master Excel Export:</b> Click 'Export Master Excel (.xlsx)' to download all multi-month performance records into a consolidated workbook.", styles))
    story.append(Spacer(1, 12))

    story.append(make_callout_box("Cloud Database & Vercel Deployment Setup", [
        "- <b>Supabase SQL:</b> Run `CREATE TABLE daily_analytics (...)` in SQL Editor and disable RLS (`ALTER TABLE daily_analytics DISABLE ROW LEVEL SECURITY;`).",
        "- <b>Vercel Environment Variables:</b> Add `SUPABASE_URL` and `SUPABASE_KEY` (Secret Key `sb_secret_...`) in Vercel Settings and Redeploy.",
        "- <b>Stateless Security:</b> HMAC-SHA256 authenticated cookies; unlimited simultaneous team logins with 12-hour session lifetime."
    ], bg="#f8fafc", border="#e2e8f0", title_col="#0f172a"))
    story.append(PageBreak())

    # ================= PAGE 13: QUICK REFERENCE & COMMON PROBLEMS =================
    story.append(Paragraph("Quick reference", h1_style))
    qref_data = [
        [Paragraph("<b>Tool</b>", body_style), Paragraph("<b>Accepts</b>", body_style), Paragraph("<b>You get</b>", body_style)],
        ["1 Remark Adder", "CSV", "Excel with a Remark column"],
        ["2 Excel to JSON", "XLSX, XLSM, CSV", "JSON text or .json file"],
        ["3 API Request Sender", "Typed or pasted JSON", "The API reply on screen (via SSRF proxy)"],
        ["4 Download Answer Null CDR", "CSV", "Excel (_filtered.xlsx)"],
        ["5 Answer Null Lead Data", "XLSX", "Excel (_MTF_ANSWER_NULL.xlsx with 57 columns)"],
        ["6 Sub-Disposition Pivot", "Portal API / CSV, XLSX", "Table (PNG, Excel, CSV, copy), summary & 8 PM Save"],
        ["7 Daily Analytics Tracker", "Saved 8 PM reports", "Multi-month trends, KPI cards, charts & Master Excel"]
    ]
    t_qref = Table(qref_data, colWidths=[140, 115, 250])
    t_qref.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('FONTNAME', (0,1), (0,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 7.8),
    ]))
    story.append(t_qref)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Common problems", h2_style))
    prob_data = [
        [Paragraph("<b>What you see</b>", body_style), Paragraph("<b>What to do</b>", body_style)],
        ["Incorrect username or password", "Check the details. After 5 wrong tries login is blocked for 15 minutes."],
        ["Columns not found in the file", "The column names in your file must match expected headers: CAMPAIGN NAME, CRM SUB-DISPOSITION."],
        ["Only .csv files are supported (Tool 4)", "Open the file in Excel and use Save As > CSV."],
        ["No rows left after filtering", "Check the spelling of campaign and gateway filters (e.g. MTF-CROSS SELL)."],
        ["Private or internal addresses not allowed (Tool 3)", "Use a public https:// address. SSRF security blocks private internal IPs."],
        ["Page refresh resets daily tracker data", "Ensure SUPABASE_URL and SUPABASE_KEY are added to Vercel Environment Variables and redeployed."],
        ["The page stops responding with a large file", "Split the file into smaller parts (files over 100 MB are too big for a browser)."],
        ["You were sent back to the login page", "Your session ended (12 hours). Log in again to continue."]
    ]
    t_prob = Table(prob_data, colWidths=[185, 320])
    t_prob.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('FONTNAME', (0,1), (0,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 7.5),
    ]))
    story.append(t_prob)
    story.append(Spacer(1, 10))

    story.append(make_callout_box("Privacy & Data Security", [
        "Files you open in tools 1, 2, 4, 5 and 6 stay 100% in your local browser memory and are never uploaded to any external server. Closing or refreshing the tab clears file buffers immediately. Only Tool 7 connects to Supabase database to persist daily 8 PM analytics."
    ]))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] Built complete image visual manual: {output_path}")

if __name__ == "__main__":
    out_pdf = "d:\\Wannee-Ai\\Converter\\MTF-Toolkit - Copy\\CDR_Toolkit_User_Manual.pdf"
    build_pdf(out_pdf)
