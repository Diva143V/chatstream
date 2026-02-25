# ChatStream Deployment Quick Reference

A quick checklist for deploying ChatStream to production.

## Pre-Deployment Checklist

### Local Verification
- [ ] Run `npm install:all` — All dependencies installed
- [ ] Run `npm run build` — No compilation errors
- [ ] Run `npm run dev` — Both servers start without errors
- [ ] Test registration, login, messaging locally
- [ ] Test avatar upload to Cloudinary
- [ ] Test real-time messaging via Socket.IO
- [ ] Push code to GitHub

### Accounts & Services
- [ ] Vercel account created (https://vercel.com)
- [ ] Render account created (https://render.com)
- [ ] GitHub repository created and code pushed
- [ ] Cloudinary account with credentials ready
- [ ] PostgreSQL credentials from local setup noted

---

## Step 1: Create PostgreSQL on Render (5 minutes)

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"PostgreSQL"**
3. Name: `chatstream-db`
4. Database: `chatstream`
5. User: `chatstream`
6. Copy connection string (starts with `postgresql://`)
7. Click **"Create Database"**

**Wait 3 minutes for provisioning...**

---

## Step 2: Deploy Backend to Render (10 minutes)

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub → select **chatstream** repo
4. **Name**: `chatstream-api`
5. **Environment**: `Node`
6. **Build Command**:
   ```
   cd server && npm install && npm run build
   ```
7. **Start Command**:
   ```
   cd server && npm start
   ```
8. Click **"Create Web Service"**

### Add Environment Variables to Render:

Go to Service → **"Environment"** and add:

```
DATABASE_URL=postgresql://chatstream:[PASSWORD]@[HOST]:5432/chatstream
JWT_SECRET=[Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"]
NODE_ENV=production
PORT=10000
CLIENT_URL=https://chatstream.vercel.app
CLOUDINARY_CLOUD_NAME=dc02w36gr
CLOUDINARY_API_KEY=579729161381888
CLOUDINARY_API_SECRET=FSyC5khoAyfICoHCfkOVC2Woea4
```

Click **"Save"** → Service redeploys

**Wait 5 minutes for deployment...**

---

## Step 3: Initialize Database (2 minutes)

Go to Render Service → **"Shell"** tab

Run:
```bash
npm run db:push
```

Verify:
```bash
npm run db:studio
```

---

## Step 4: Deploy Frontend to Vercel (5 minutes)

### Option A: Via Vercel CLI

```bash
npm install -g vercel
vercel login
cd client
vercel --prod
```

### Option B: Via Web Dashboard

1. Go to https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Import **chatstream** from GitHub
4. **Framework**: Vite (auto-detected)
5. Click **"Deploy"**

**Wait 2 minutes for deployment...**

---

## Step 5: Configure Frontend Environment (2 minutes)

In Vercel Dashboard:

1. Project → **"Settings"** → **"Environment Variables"**
2. Add variable:
   ```
   VITE_API_URL=https://chatstream-api.onrender.com
   ```
3. Click **"Save"**
4. Go to **"Deployments"** → **"Redeploy"** latest deployment

---

## Step 6: Post-Deployment Testing (5 minutes)

### Test Frontend
```
Open: https://chatstream.vercel.app
✓ Page loads
✓ Landing page displays
✓ No console errors
```

### Test Backend
```bash
curl https://chatstream-api.onrender.com/health
# Expected: {"status":"ok","timestamp":"..."}
```

### Test API
```bash
curl -X POST https://chatstream-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","username":"testuser","password":"Pass123!"}'
# Expected: user object + token
```

### Test WebSocket
In browser console on https://chatstream.vercel.app:
```javascript
const socket = io('https://chatstream-api.onrender.com', {
  auth: { token: 'your-jwt-from-login' }
});
socket.on('connect', () => console.log('✅ Connected!'));
```

---

## Optional: Custom Domain Setup (15 minutes)

### Frontend Domain (Vercel)
1. Vercel Project → **"Settings"** → **"Domains"**
2. Add: `chatstream.yourdomain.com`
3. Add DNS record (Vercel will show exact record needed)

### Backend Domain (Render)
1. Render Service → **"Settings"** → **"Custom Domains"**
2. Add: `api.yourdomain.com`
3. Add DNS record

### Update Backend Environment
Render Service → **"Environment"** → Update:
```
CLIENT_URL=https://chatstream.yourdomain.com
```
Redeploy.

---

## Troubleshooting

### Backend not starting
```
Error: Cannot connect to database
→ Check DATABASE_URL is correct from PostgreSQL connection
→ Verify PostgreSQL is provisioned (not still pending)
→ Check PORT=10000 is set
```

### API calls return 404
```
Error: POST /api/auth/login → 404
→ Check VITE_API_URL in Vercel matches Render URL
→ Verify backend service is running
→ Check Client → Backend CORS (CLIENT_URL setting)
```

### WebSocket connection fails
```
Error: WebSocket refused
→ Check backend URL uses HTTPS (not HTTP)
→ Verify socket.io-client transports include 'polling'
→ Check firewall allows WebSocket
```

### Can't upload avatar
```
Error: Failed to upload avatar
→ Verify CLOUDINARY_* env vars in Render
→ Check Cloudinary credentials are valid
→ Verify authenticated user (valid JWT)
```

### Database connection timeout
```
Error: ECONNREFUSED
→ PostgreSQL may not be fully provisioned (wait 5+ min)
→ Check host/port in DATABASE_URL
```

---

## Important URLs

### Production
- **Frontend**: https://chatstream.vercel.app
- **Backend API**: https://chatstream-api.onrender.com
- **Backend Health**: https://chatstream-api.onrender.com/health

### Services
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Render Dashboard**: https://dashboard.render.com
- **Cloudinary Console**: https://console.cloudinary.com
- **GitHub Repo**: https://github.com/YOUR_USERNAME/chatstream

---

## Environment Variables Reference

### Backend (Render .env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=[strong-random-string]
NODE_ENV=production
PORT=10000
CLIENT_URL=https://chatstream.vercel.app
CLOUDINARY_CLOUD_NAME=dc02w36gr
CLOUDINARY_API_KEY=579729161381888
CLOUDINARY_API_SECRET=FSyC5khoAyfICoHCfkOVC2Woea4
```

### Frontend (Vercel environment)
```
VITE_API_URL=https://chatstream-api.onrender.com
```

---

## Monitoring

### Vercel
- Dashboard → Project → **"Analytics"** tab
- Dashboard → Project → **"Deployments"** tab for logs

### Render
- Dashboard → Service → **"Logs"** tab
- Monitor for errors, warnings

---

## Total Time Estimate

| Step | Time |
|------|------|
| PostgreSQL setup | 5 min |
| Backend deployment | 10 min |
| Database init | 2 min |
| Frontend deployment | 5 min |
| Configuration | 2 min |
| Testing | 5 min |
| **Total** | **~30 minutes** |

---

## Common Commands

### Generate JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Test Database Connection
```bash
psql "postgresql://user:pass@host:5432/db"
```

### View Backend Logs (Render Shell)
```bash
tail -f logs.log
```

### Rebuild Frontend (Vercel)
Dashboard → Deployments → Select deployment → "..." → "Redeploy"

### Deploy Backend Updates (Render)
Push to GitHub → Select branch → Click "Deploy"

---

## After Deployment

1. ✅ Share your app URL: https://chatstream.vercel.app
2. ✅ Test with team members
3. ✅ Set up automated backups for database
4. ✅ Monitor Vercel Analytics
5. ✅ Check Render logs regularly
6. ✅ Keep dependencies updated
7. ✅ Plan for scaling (upgrade plans if needed)

---

**Deployment Complete! Your ChatStream is live! 🚀**
