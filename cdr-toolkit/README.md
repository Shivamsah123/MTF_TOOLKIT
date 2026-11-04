# CDR Toolkit (login protected)

Six tools behind one admin login. The whole site, including the tool pages and the API sender,
is only served after a successful login.

## Where to set the password (Vercel)

1. Open vercel.com > your project > **Settings** > **Environment Variables**
2. Add these variables (choose Production, and Preview if you use it):

| Name | Required | Meaning |
|------|----------|---------|
| `ADMIN_PASSWORD` | yes | The admin password. Use a long one (12+ characters). |
| `ADMIN_USERNAME` | no | Login name. Default is `Admin` (not case sensitive). |
| `SESSION_SECRET` | no | Random text used to sign the login cookie. If empty, it is derived from the password. |

3. Click **Save**, then **Deployments > Redeploy**. Variables only apply to new deployments.

With the CLI instead: `vercel env add ADMIN_PASSWORD production`, then `vercel --prod`.

To change the password later: edit `ADMIN_PASSWORD` and redeploy. Everybody is logged out when you do.
`ACCESS_KEY` from the old version is no longer used.

## Deploy

IMPORTANT: the files `api/` and `vercel.json` must be at the ROOT of your Git repository (or set Vercel's
"Root Directory" to the folder that contains them). Push the CONTENTS of this folder, not a parent folder.

After deploying, check https://YOUR-SITE.vercel.app/api/health. It must show `{"ok":true,...}`.
If it shows 404, Vercel is looking at the wrong folder (Settings > General > Root Directory).

- GitHub: push the contents of this folder to a repo, import it in Vercel, set the variables above, deploy.
- CLI: run `vercel` inside this folder, set the variables, then `vercel --prod`.

Open the site, log in with `Admin` and your password.

## How it works

- `api/login.js` checks the username and password and sets a signed, HttpOnly, 12 hour cookie.
- `api/app.js` serves every page. Only the login page is public.
- `api/send.js` (API Request Sender) needs the cookie too. It blocks private and internal addresses.
- `api/_pages.js` contains all pages. It is generated from `../cdr-toolkit-source` (see its README).
- After 5 wrong attempts from one address the login is blocked for 15 minutes (best effort on Vercel).
- Use HTTPS only (Vercel does this for you).

## Run locally

Node 18+ is required.

1. `node local.js`
2. Open the address it prints (usually http://localhost:3000)
3. Log in with `Admin` / `admin123`, or run `ADMIN_PASSWORD=yourpassword node local.js`
   (on Windows: `set ADMIN_PASSWORD=yourpassword && node local.js`)
