# Chat App - cleaned deployment package

This project is split into `client` (Vite/React) and `server` (Express/MongoDB).

## Before pushing to GitHub

1. The original `.env` files have intentionally been removed from this ZIP.
2. Add fresh environment variables in Vercel; do not commit secrets.
3. Rotate credentials that were ever committed or shared:
   - MongoDB database user password
   - JWT_SECRET
   - Cloudinary API secret (and API key if exposed)

## Local development

### Backend
```bash
cd server
npm install
cp .env.example .env
# Fill in the real values in server/.env
npm run server
```

### Frontend
```bash
cd client
npm install
cp .env.example .env
# Set VITE_BACKEND_URL=http://localhost:5000
npm run dev
```

## Vercel deployment

Use two Vercel projects connected to this repository:

### Backend project
- Root Directory: `server`
- Environment variables: `MONGODB_URI`, `JWT_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLIENT_URL`
- `CLIENT_URL` should be the exact deployed frontend origin, e.g. `https://your-frontend.vercel.app`
- Redeploy after setting variables.

### Frontend project
- Root Directory: `client`
- Environment variable: `VITE_BACKEND_URL=https://your-backend.vercel.app`
- Redeploy after setting variables.

The backend `/` and `/api/status` health routes do not require MongoDB. API routes connect to MongoDB before running.

## Socket.IO limitation

Vercel Functions are not a persistent WebSocket host. The API/authentication and database-backed message endpoints can run on Vercel, but real-time events/online status require deploying the Socket.IO server on a persistent Node.js host (e.g. Render or Railway). Set `VITE_SOCKET_URL` only after that server is deployed. Local development continues to use Socket.IO on the Express HTTP server.

## MongoDB URI

Use a MongoDB Atlas database user (not your Atlas website login). URL-encode special characters in the database password. Example shape:

`mongodb+srv://DB_USER:URL_ENCODED_PASSWORD@CLUSTER_HOST/?retryWrites=true&w=majority`

Do not paste credentials into source code or commit them.
