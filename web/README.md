# HR Attendance Management System

Pixel-faithful static mobile UI built with React 18, Vite, TypeScript, Tailwind CSS, React Router, and Lucide icons.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173` in a browser.

## Production build

```bash
npm run typecheck
npm run build
```

## Routes

- `/` — Login
- `/dashboard` — Dashboard
- `/scan/fingerprint` — Fingerprint scan
- `/scan/face` — Face recognition scan
- `/not-registered` — Not in database

All interactions are local and static. Login and scan buttons only simulate the specified route transitions.
