# CDR Toolkit (Full-Stack Suite)
<!-- vercel deploy trigger -->

Production-ready, ultra-fast, and secure full-stack Call Detail Record (CDR) Toolkit with React frontend and hardened Node.js backend.

---

## 📁 Project Architecture (`frontend` & `backend`)

```text
MTF-Toolkit - Copy/
│
├── frontend/                               # ⚛️ React 19 Frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx                   # Waanee AI official login screen
│   │   │   ├── Header.jsx                  # Top navigation & session logout
│   │   │   └── Sidebar.jsx                 # 1-6 tool navigation sidebar
│   │   ├── tools/                          # 🛠️ 6 INDEPENDENT CONVERTERS
│   │   │   ├── 1-DispositionRemark/        # Tool 1: Disposition Remark Converter
│   │   │   ├── 2-ExcelToJson/              # Tool 2: Excel to JSON Converter
│   │   │   ├── 3-ApiSender/                # Tool 3: API Request Sender
│   │   │   ├── 4-AnswerNullCdr/            # Tool 4: Download Answer Null CDR
│   │   │   ├── 5-LeadToAnswerNull/         # Tool 5: Answer Null Lead Data
│   │   │   └── 6-SubDispositionPivot/      # Tool 6: Sub-Disposition Pivot & Connectivity
│   │   ├── App.jsx                         # Main router & session check
│   │   ├── index.css                       # Complete design system & responsive layout
│   │   └── main.jsx
│   ├── public/                             # logo.png, photo.jpg, favicon.svg
│   ├── index.html
│   ├── vite.config.js                      # Configured with /api proxy to backend
│   └── package.json
│
├── backend/                                # 🛡️ High-Performance Secure Node.js Backend
│   ├── src/
│   │   ├── auth.js                         # HMAC-SHA256 session token, timingSafeEqual, brute-force lock
│   │   ├── proxy.js                        # SSRF-protected CORS proxy with DNS resolution check
│   │   └── server.js                       # Native HTTP server, Gzip compression, static file serving
│   ├── .env.example
│   └── package.json
│
└── package.json                            # Root scripts for running frontend, backend, or full build
```

---

## 🔒 Security Features (Production Hardened)

1. **HMAC-SHA256 Signed Session Cookies**:
   - `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` (in production).
   - Tamper-proof session tokens.
2. **Brute-Force Rate Limiter**:
   - 5 failed login attempts lock the IP address for 15 minutes.
3. **Constant-Time Password Comparison**:
   - Uses `crypto.timingSafeEqual` to prevent side-channel timing attacks.
4. **SSRF-Protected API Proxy (`/api/send`)**:
   - Blocks private IP ranges (127.0.0.1, 10.x.x.x, 192.168.x.x, 172.16.x.x).
   - Blocks cloud metadata endpoints (`169.254.169.254`).
   - Resolves DNS before fetching to defeat DNS rebinding attacks.
   - 15-second strict timeout.
5. **High-Performance Static Serving**:
   - Native Node.js HTTP server (< 25MB RAM, instant 1ms startup).
   - Automatic Gzip compression for text, CSS, JS, and JSON.
   - Long-term caching headers (`Cache-Control: max-age=1 year, immutable`) for hashed assets.

---

## 🚀 How to Run

### Option 1: Complete Production Server (Frontend + Backend on Port 5000)
Runs the entire full-stack app on a single port:
```bash
# 1. Build frontend
npm run build

# 2. Start production server
npm start
```
Open **`http://localhost:5000`** in your browser.

---

### Option 2: Development Mode (Hot Reload)

**Terminal 1 (Backend Server on Port 5000):**
```bash
npm run dev:backend
```

**Terminal 2 (Frontend with Vite HMR on Port 5173):**
```bash
npm run dev:frontend
```
Open **`http://localhost:5173`** in your browser. Any API request (`/api/*`) is automatically proxied to port 5000.

---

## 🔑 Default Login Credentials
- **Username**: `Admin` *(case-insensitive)*
- **Password**: `admin123`
*(Can be changed via `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables).*

