# CDR Toolkit (React Version)

A modern, fast, and completely modular React implementation of the **CDR Toolkit** suite.

## ✨ Features
- **Identical Look & Feel**: Preserves the exact styling, sidebar navigation, step-by-step cards, badges, and responsive design.
- **100% Independent Converters**: Every tool is an isolated React component with its own state and zero inter-tool coupling.
- **Offline & Privacy-First**: All Excel, CSV, and calculation tasks run locally in your browser using SheetJS (`xlsx`).
- **High-DPI Canvas Screenshots**: Sub-Disposition Pivot table and Summary can be downloaded or copied to clipboard as crisp images.

---

## 🛠️ The 6 Independent Converters

| # | Tool | Location | Description |
|---|------|----------|-------------|
| 1 | **Disposition Remark Converter** | `src/tools/1-DispositionRemark/` | CDR CSV upload, filters `MTF-CROSS SELL` & `Interested` / `Connected to an executive`, remark pairing, and Excel export. |
| 2 | **Excel to JSON** | `src/tools/2-ExcelToJson/` | Uploads `.xlsx`, `.xlsm`, `.csv`, provides flexible column mapping, and outputs formatted JSON. |
| 3 | **API Request Sender** | `src/tools/3-ApiSender/` | Send HTTP requests (GET, POST, PUT, etc.) with Bearer, Basic, or API Key auth and response inspection. Automatically can load output from Excel to JSON. |
| 4 | **Download Answer Null CDR** | `src/tools/4-AnswerNullCdr/` | Filters CDR records by Campaign, Gateway Disposition, and null CRM Dispositions. |
| 5 | **Answer Null Lead Data** | `src/tools/5-LeadToAnswerNull/` | Standardizes Lead Data into the 57-column CRM format with formatted date serials. |
| 6 | **Sub-Disposition Pivot** | `src/tools/6-SubDispositionPivot/` | Interactive pivot tables, call connectivity rates, Excel/CSV export, and direct-to-clipboard screenshot copying. |

---

## 🚀 How to Run

### Development Mode
```bash
cd cdr-toolkit-react
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build
```bash
cd cdr-toolkit-react
npm run build
npm run preview
```
The output will be generated inside the `dist/` directory ready for deployment to any static host (Vercel, Netlify, GitHub Pages, or S3).
