# Frontend (Vite + React)

This is a minimal React frontend scaffold for the airline app. It proxies API requests to the Django backend at `/api/` (configured in `vite.config.js`).

Quick start

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and the app will fetch from the Django backend at http://localhost:8000/api/

Notes
- This is a simple scaffold (no auth). If you secure the API later, you'll need to add login flows and token management.
- The frontend assumes the backend is running locally on port 8000.
