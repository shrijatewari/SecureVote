# 🚀 Quick Deploy to Vercel - shrijatewari

## ✅ Step 1: Code is Already on GitHub
Repository: `https://github.com/shrijatewari/voting-dbms-project`

## 📋 Step 2: Deploy Frontend to Vercel

1. **Go to**: https://vercel.com
2. **Login** with GitHub (use shrijatewari account)
3. **Click**: "Add New Project"
4. **Import**: `shrijatewari/voting-dbms-project`
5. **Configure**:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
6. **Environment Variables**:
   - `VITE_API_URL` = `https://your-backend-url.vercel.app` (update after backend deploy)
7. **Click**: "Deploy"
8. **Copy**: Frontend URL (e.g., `https://voting-dbms-project.vercel.app`)

## 📋 Step 3: Deploy Backend to Vercel

1. **Click**: "Add New Project" again
2. **Import**: Same repo `shrijatewari/voting-dbms-project`
3. **Configure**:
   - **Framework Preset**: Other
   - **Root Directory**: `backend` (IMPORTANT!)
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
   - **Install Command**: `npm install`
4. **Environment Variables** (add these):
   ```
   DB_HOST=your_db_host
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=voting_system
   DB_PORT=3306
   JWT_SECRET=your_secure_jwt_secret_min_32_characters_long_random_string
   NODE_ENV=production
   CORS_ORIGIN=https://your-frontend-url.vercel.app
   PORT=3000
   ```
5. **Click**: "Deploy"
6. **Copy**: Backend URL (e.g., `https://voting-dbms-backend.vercel.app`)

## 🔄 Step 4: Update Frontend API URL

1. Go to **Frontend Project** → **Settings** → **Environment Variables**
2. Update `VITE_API_URL` to your backend URL
3. Go to **Deployments** → Click **"..."** → **Redeploy**

## 🗄️ Step 5: Database Setup

**Option 1: Vercel Postgres (Easiest)**
- In Backend project → **Storage** tab → **Create Database** → **Postgres**
- Copy connection details and update environment variables

**Option 2: External MySQL**
- Use **PlanetScale** (free): https://planetscale.com
- Or **Railway** (free): https://railway.app
- Update DB environment variables in Vercel

## ✅ Step 6: Run Migrations

After database is set up, you'll need to run migrations. You can:
- Use Vercel CLI: `vercel env pull` then run migrations locally pointing to production DB
- Or use a database management tool to run SQL migrations

## 🎉 Done!

Your app will be live at:
- **Frontend**: `https://your-frontend.vercel.app`
- **Backend**: `https://your-backend.vercel.app`
