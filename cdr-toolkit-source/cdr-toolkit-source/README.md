# CDR Toolkit - source pages (do NOT deploy this folder)

The deployable project is `../cdr-toolkit`. This folder only holds the editable HTML pages.

To change a page:
1. Edit the file in `site/` (login page, `index.html`, or `tools/*.html`)
2. Run `node build.js`  (rewrites `../cdr-toolkit/api/_pages.js`)
3. Deploy `../cdr-toolkit` again
