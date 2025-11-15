# 🚀 Quick Deploy Instructions

## ✅ Your code is ready! Follow these steps:

### 1️⃣ Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `voting-dbms-project`
3. Description: `Government-grade Election Management System`
4. **DO NOT** check "Initialize with README"
5. Click **"Create repository"**

### 2️⃣ Push to GitHub

**Copy and paste these commands** (replace YOUR_USERNAME):

```bash
cd /Users/shrijatewari/Desktop/voting-dbms-project

git remote add origin https://github.com/YOUR_USERNAME/voting-dbms-project.git

git branch -M main

git push -u origin main
```

**Note**: You'll need to enter your GitHub username and password (or Personal Access Token).

### 3️⃣ Deploy Frontend to Vercel

1. Go to https://vercel.com
2. Sign up/Login with GitHub
3. Click **"Add New Project"**
4. Import `voting-dbms-project`
5. Configure:
   - Framework: **Vite**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Add Environment Variable:
   - Name: `VITE_API_URL`
   - Value: `http://localhost:3000` (update after backend deploy)
7. Click **"Deploy"**

### 4️⃣ Deploy Backend to Vercel

1. Create **another new project** in Vercel
2. Import the same repository
3. Configure:
   - Root Directory: `./backend`
   - Framework: **Other**
   - Build Command: (leave empty)
4. Add Environment Variables:
   ```
   DB_HOST=your_database_host
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=voting_dbms
   JWT_SECRET=your_secure_jwt_secret_min_32_chars
   PORT=3000
   NODE_ENV=production
   CORS_ORIGIN=https://your-frontend-url.vercel.app
   ```
5. Deploy

### 5️⃣ Update Frontend API URL

After backend deploys, update frontend environment variable:
- Go to Frontend project → Settings → Environment Variables
- Update `VITE_API_URL` to your backend URL
- Redeploy

### 6️⃣ Set Up Database

**Option A: Vercel Postgres (Easiest)**
- Go to Backend project → Storage → Create Postgres
- Update DB environment variables

**Option B: External MySQL**
- Use PlanetScale, Railway, or Supabase
- Update DB environment variables

### 7️⃣ Run Migrations

After database is set up, run migrations (see DEPLOYMENT.md for details).

---

## 🎉 Done!

Your project will be live at:
- Frontend: `https://your-project.vercel.app`
- Backend: `https://your-backend.vercel.app`

---

## 📚 Need More Details?

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete guide.

