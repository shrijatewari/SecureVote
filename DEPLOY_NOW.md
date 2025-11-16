# 🚀 Quick Deployment Guide - GitHub & Vercel

## ✅ Step 1: GitHub Push (Already Done!)
Your code is already pushed to: `https://github.com/shrijatewari/voting-dbms-project.git`

## 🚀 Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Web Dashboard (Recommended)

#### Frontend Deployment:

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com
   - Sign in with GitHub (use the same account as your repo)

2. **Import Frontend Project**
   - Click "Add New..." → "Project"
   - Select "Import Git Repository"
   - Choose `shrijatewari/voting-dbms-project`
   - Click "Import"

3. **Configure Frontend**
   - **Framework Preset:** Vite (auto-detected)
   - **Root Directory:** `./` (root)
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)

4. **Add Environment Variables** (Click "Environment Variables"):
   ```
   VITE_API_URL=https://your-backend-url.vercel.app/api
   ```
   (You'll update this after backend is deployed)

5. **Deploy**
   - Click "Deploy"
   - Wait ~2-3 minutes
   - Your frontend will be live! (e.g., `https://voting-dbms-project.vercel.app`)

#### Backend Deployment:

1. **Create New Project for Backend**
   - In Vercel Dashboard, click "Add New..." → "Project" again
   - Import the same repository: `shrijatewari/voting-dbms-project`

2. **Configure Backend**
   - **Framework Preset:** Other
   - **Root Directory:** `backend`
   - **Build Command:** (leave empty)
   - **Output Directory:** (leave empty)
   - **Install Command:** `npm install`

3. **Add Environment Variables**:
   ```
   NODE_ENV=production
   DB_HOST=your-database-host
   DB_PORT=3306
   DB_USER=your-database-user
   DB_PASSWORD=your-database-password
   DB_NAME=voting_system
   JWT_SECRET=9e660f6bebbf8e8d72e6f4d7d11182635bfdf5230abd80a4d663d82b70d38f6826f40ad12061ce0393e3f8efb85dc4b3d13b7f4a504942ffedbcf26078320521
   JWT_EXPIRES_IN=30d
   FRONTEND_ORIGIN=https://your-frontend-url.vercel.app
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait ~1-2 minutes
   - Your backend will be live! (e.g., `https://voting-dbms-project-backend.vercel.app`)

5. **Update Frontend API URL**
   - Go back to Frontend Project → Settings → Environment Variables
   - Update `VITE_API_URL` to: `https://your-backend-url.vercel.app/api`
   - Redeploy frontend (Vercel auto-redeploys when env vars change)

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Deploy Frontend (from root directory)
cd /Users/shrijatewari/Desktop/voting-dbms-project
vercel --prod

# Deploy Backend (from backend directory)
cd /Users/shrijatewari/Desktop/voting-dbms-project/backend
vercel --prod
```

## 📝 Important Notes:

1. **Database**: You need a hosted MySQL database (Vercel doesn't provide MySQL)
   - Options: PlanetScale, AWS RDS, Railway, or any MySQL hosting
   - Update `DB_HOST`, `DB_USER`, `DB_PASSWORD` in backend env vars

2. **Auto-Deploy**: Vercel automatically deploys on every push to `main` branch

3. **CORS**: Backend is already configured to accept requests from your frontend origin

4. **Build Time**: Frontend ~2-3 min, Backend ~1-2 min

## 🔗 Your Repository:
https://github.com/shrijatewari/voting-dbms-project

## ✅ Next Steps:
1. Deploy frontend to Vercel
2. Deploy backend to Vercel
3. Update frontend `VITE_API_URL` with backend URL
4. Test the deployed application!
