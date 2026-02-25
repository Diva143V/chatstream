# ChatStream Deployment Guide — Vercel (Frontend)

Complete step-by-step instructions for deploying ChatStream's frontend to Vercel.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
3. [Backend Deployment (Render)](#backend-deployment-render)
4. [Environment Variables](#environment-variables)
5. [Custom Domain Setup](#custom-domain-setup)
6. [Post-Deployment Testing](#post-deployment-testing)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts
- ✅ **Vercel Account** — Sign up at https://vercel.com
- ✅ **Render Account** — Sign up at https://render.com
- ✅ **GitHub Account** — Link your repository (optional but recommended)
- ✅ **Cloudinary Account** — Already set up!
- ✅ **PostgreSQL Database** — Use Render's managed PostgreSQL

### Git Repository
If not already done, initialize git and push to GitHub:

```bash
cd chatstream
git init
git add .
git commit -m "Initial commit: ChatStream full-stack app"
git remote add origin https://github.com/YOUR_USERNAME/chatstream.git
git push -u origin main
```

---

## Frontend Deployment (Vercel)

### Step 1: Prepare Frontend for Production

#### Update Build Configuration
No changes needed — Vite is already configured optimally.

#### Verify Build Works Locally
```bash
cd client
npm run build
npm run preview
```

Expected output:
```
✓ built in 2.34s
Port 4173: http://localhost:4173/
```

### Step 2: Deploy to Vercel

#### Option A: Using Vercel CLI (Recommended)

**Install Vercel CLI:**
```bash
npm install -g vercel
```

**Login to Vercel:**
```bash
vercel login
```

**Deploy:**
```bash
cd c:\Users\divap\claude\chatstream\client
vercel --prod
```

You'll be prompted with questions:
```
? Set up and deploy "chatstream-client"? (y/N) → y
? Which scope do you want to deploy to? → [Your Account]
? Link to existing project? (y/N) → N
? What's your project's name? → chatstream
? In which directory is your code located? → ./
? Want to modify vercel.json? (y/N) → N
```

#### Option B: Via Vercel Web Dashboard

1. Go to **https://vercel.com/dashboard**
2. Click **"Add New..."** → **"Project"**
3. Select **GitHub** (if repository is pushed)
4. Search for and select **chatstream** repository
5. Click **"Import"**
6. Keep default settings (Vercel auto-detects Vite)
7. Click **"Deploy"**

### Step 3: Configure Environment Variables

After deployment, configure environment variables:

1. Go to **Vercel Dashboard** → Your **chatstream** project
2. Click **"Settings"** → **"Environment Variables"**
3. Add the following variables:

```
Name: VITE_API_URL
Value: https://your-backend-deploy.onrender.com
Environment: Production, Preview, Development
```

4. Click **"Save"**
5. Redeploy from Vercel dashboard (Settings → Deployments → Redeploy)

**Note**: After backend is deployed, update `VITE_API_URL` with the actual Render backend URL.

### Step 4: Verify Frontend Deployment

```bash
# Check build output
npm run build

# Verify no TypeScript errors
npx tsc --noEmit
```

Expected result:
- ✅ No compilation errors
- ✅ Build artifacts in `dist/` folder
- ✅ All assets optimized

---

## Backend Deployment (Render)

### Step 1: Create PostgreSQL Database on Render

1. Go to **https://dashboard.render.com**
2. Click **"New +"** → **"PostgreSQL"**
3. Fill in the form:
   - **Name**: `chatstream-db`
   - **Database**: `chatstream`
   - **User**: `chatstream`
   - **Region**: Choose closest to you
   - **Version**: Latest PostgreSQL
   - **Plan**: Free tier (for testing) or Paid (for production)
4. Click **"Create Database"**

**Wait 2-3 minutes for provisioning...**

Once ready, you'll see connection details:
```
Host: dpg-xxxx.render.internal
Database: chatstream
User: chatstream
Password: [auto-generated]
Port: 5432
```

### Step 2: Create Render Service for Backend

1. Go to **https://dashboard.render.com**
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select the **chatstream** repository
5. Fill in the form:
   - **Name**: `chatstream-api`
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install && npm run build`
   - **Start Command**: `cd server && npm start`
   - **Plan**: Free tier (for testing) or Paid (for production)

6. Click **"Create Web Service"**

### Step 3: Configure Backend Environment Variables

In Render dashboard for **chatstream-api**:

1. Click **"Environment"**
2. Add these variables:

```
DATABASE_URL=postgresql://chatstream:[PASSWORD]@dpg-xxxx.render.internal:5432/chatstream

JWT_SECRET=[Generate random: https://tool.string-functions.com/string-generator]

NODE_ENV=production

PORT=10000

CLIENT_URL=https://chatstream.vercel.app

CLOUDINARY_CLOUD_NAME=dc02w36gr

CLOUDINARY_API_KEY=579729161381888

CLOUDINARY_API_SECRET=FSyC5khoAyfICoHCfkOVC2Woea4
```

3. Click **"Save"**
4. Service will auto-redeploy with new variables

### Step 4: Initialize Backend Database on Render

Once service is deployed:

1. Go to **"Shell"** tab in Render service
2. Run Prisma migrations:

```bash
npm run db:push
```

3. Verify tables were created:

```bash
npm run db:studio
```

---

## Environment Variables

### Frontend (.env in client directory)

```env
VITE_API_URL=https://chatstream-api.onrender.com
```

### Backend (.env in server directory)

**Development** (local):
```env
DATABASE_URL="postgresql://postgres:230107@localhost:5432/chatstream"
JWT_SECRET="dev-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=development
CLIENT_URL="http://localhost:5173"
CLOUDINARY_CLOUD_NAME="dc02w36gr"
CLOUDINARY_API_KEY="579729161381888"
CLOUDINARY_API_SECRET="FSyC5khoAyfICoHCfkOVC2Woea4"
```

**Production** (Render):
```env
DATABASE_URL=postgresql://chatstream:[PASSWORD]@dpg-xxxx.render.internal:5432/chatstream
JWT_SECRET=[STRONG_RANDOM_SECRET]
JWT_EXPIRES_IN="7d"
PORT=10000
NODE_ENV=production
CLIENT_URL=https://chatstream.vercel.app
CLOUDINARY_CLOUD_NAME="dc02w36gr"
CLOUDINARY_API_KEY="579729161381888"
CLOUDINARY_API_SECRET="FSyC5khoAyfICoHCfkOVC2Woea4"
```

### Generate Secure JWT Secret

```bash
# Use this command to generate a strong secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Custom Domain Setup

### For Frontend (Vercel)

1. Go to **Vercel Dashboard** → **chatstream** project
2. Click **"Settings"** → **"Domains"**
3. Enter your domain: `chatstream.yourdomain.com`
4. Click **"Add"**
5. Vercel provides DNS records to add:
   - Add `CNAME` record pointing to Vercel
   - Or use Vercel Nameservers

### For Backend (Render)

1. Go to **Render Dashboard** → **chatstream-api** service
2. Click **"Settings"** → **"Custom Domains"**
3. Enter your domain: `api.chatstream.yourdomain.com`
4. Add DNS record as instructed

### Update Environment Variables

After domains are live:

1. **Frontend (Vercel)**:
   - No changes needed (Vercel manages domain)

2. **Backend (Render)**:
   - Update `CLIENT_URL` environment variable
   - Set to: `https://chatstream.yourdomain.com`
   - Redeploy

---

## Post-Deployment Testing

### Test Frontend

```bash
# Visit your deployed URL
https://chatstream.vercel.app

# Test landing page loads
# Test navigation
# Verify no console errors
```

### Test Backend API

```bash
# Health check endpoint
curl https://chatstream-api.onrender.com/health

# Expected response:
# {"status":"ok","timestamp":"2026-02-25T..."}
```

### Test Authentication

```bash
# Register a new user
curl -X POST https://chatstream-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "username":"testuser",
    "password":"TestPassword123"
  }'

# Expected: User object + JWT token
```

### Test Real-time Connection

In browser console:

```javascript
const socket = io('https://chatstream-api.onrender.com', {
  auth: { token: 'your-jwt-token' },
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected! Socket ID:', socket.id);
});
```

---

## Troubleshooting

### Frontend (Vercel)

#### Build Fails
**Error**: `npm ERR! Cannot find module`
- **Solution**: Check `node_modules` is not in git
- Run `npm install` before deploying

#### 404 on Refresh
**Error**: Page goes 404 when refreshing
- **Solution**: Vercel needs routing configuration
- Create `vercel.json` in root:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

#### API Calls 404
**Error**: `POST /api/auth/login` returns 404
- **Solution**: Update `VITE_API_URL` in Vercel environment variables
- Ensure backend is deployed on Render first

#### WebSocket Connection Fails
**Error**: `WebSocket connection to '...' failed`
- **Solution**: Check `socket.io-client` transport configuration
- Render may require `polling` as fallback
- Already configured in `useSocket.ts`

### Backend (Render)

#### Database Connection Fails
**Error**: `ECONNREFUSED` on startup
- **Solution**: Check `DATABASE_URL` environment variable
- Verify database is provisioned
- Wait 5+ minutes after database creation

#### Build Command Fails
**Error**: `npm ERR! peer dependency missing`
- **Solution**: Add `npm ci` before `npm run build`:
  ```
  npm ci && npm run build
  ```

#### Port Already in Use
**Error**: `listen EADDRINUSE :::10000`
- **Solution**: Use PORT from environment (default 10000 on Render)
- Don't hardcode port—use `process.env.PORT`

#### CORS Error
**Error**: `Access to XMLHttpRequest blocked by CORS`
- **Solution**: Update `CLIENT_URL` in backend environment
- Must match frontend domain exactly
- Redeploy after changing

### Testing Checklist

- [ ] Frontend loads at `https://chatstream.vercel.app`
- [ ] Backend health check works: `curl /health`
- [ ] Can register: `POST /api/auth/register`
- [ ] Can login: `POST /api/auth/login`
- [ ] Can fetch servers: `GET /api/servers`
- [ ] Can send message: `POST /api/messages/channel/:id`
- [ ] WebSocket connects: `socket.on('connect')`
- [ ] Real-time messages work
- [ ] Avatar upload works
- [ ] No CORS errors in console

---

## Performance Optimization

### Frontend (Vercel)

✅ Already optimized:
- Vite build compression
- Code splitting by route
- Image optimization
- CSS minification

### Backend (Render)

Add to `server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "outDir": "./dist"
  }
}
```

---

## Monitoring & Logs

### Vercel Logs

1. **Dashboard** → Project → **"Deployments"**
2. Click any deployment
3. View **"Logs"** tab
4. Monitor build and runtime errors

### Render Logs

1. **Dashboard** → Service → **"Logs"**
2. View real-time logs
3. Filter by `Error`, `Warning`, `Info`

### Enable Debug Logging

**Backend** in `.env`:
```env
NODE_ENV=development
DEBUG=*
```

**Frontend** in browser console:
```javascript
localStorage.setItem('debug', 'socket.io-client:*');
```

---

## Scaling

### Horizontal Scaling

**Render**:
- Upgrade plan from Free to Standard/Pro
- Scales automatically with traffic

**Vercel**:
- Automatically scaled globally
- No configuration needed
- Edge functions in Pro plan

### Database Scaling

**PostgreSQL on Render**:
- Upgrade plan: Free → Standard → Professional
- Monitor connections in Render dashboard
- Add read replicas if needed

---

## Security Checklist

- [ ] Change `JWT_SECRET` from default
- [ ] Use strong database password
- [ ] Enable HTTPS (automatic on Vercel/Render)
- [ ] Set `NODE_ENV=production`
- [ ] Hide `.env` from git (check `.gitignore`)
- [ ] Rotate `CLOUDINARY_API_SECRET` periodically
- [ ] Monitor API rate limits
- [ ] Use CORS whitelist (specific domains only)
- [ ] Enable security headers (Helmet)
- [ ] Regular database backups

---

## Rollback

### If Deployment Breaks

**Vercel**:
1. Dashboard → Deployments
2. Click previous successful deployment
3. Click "..." → "Promote to Production"

**Render**:
1. Dashboard → Service → Deployments
2. Click previous successful deployment
3. Click "Deploy" to restore

---

## Next Steps

1. ✅ Deploy frontend to Vercel
2. ✅ Deploy backend to Render
3. ✅ Set up custom domain
4. ✅ Monitor logs and performance
5. ✅ Set up automated backups
6. ✅ Configure CI/CD (GitHub Actions)

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Render Docs**: https://render.com/docs
- **Prisma Migration**: https://www.prisma.io/docs/orm/prisma-migrate
- **Socket.IO Deployment**: https://socket.io/docs/v4/socket-io-protocol/

---

**ChatStream is ready for production deployment! 🚀**
