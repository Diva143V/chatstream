# ChatStream Setup Checklist

Complete local development setup in 15 minutes.

## Phase 1: Prerequisites (5 min)

- [ ] **Node.js 18+** installed
  ```powershell
  node --version    # Should be v18+
  npm --version     # Should be v8+
  ```

- [ ] **PostgreSQL 14+** installed & running
  ```powershell
  psql --version              # Check installation
  pg_isready -h localhost     # Check if running
  ```

- [ ] **Git** installed
  ```powershell
  git --version
  ```

- [ ] **Code editor** (VS Code recommended)
  ```powershell
  code --version
  ```

---

## Phase 2: Project Setup (3 min)

- [ ] **Clone repository**
  ```bash
  git clone <repository-url>
  cd chatstream
  ```

- [ ] **Verify structure**
  ```powershell
  ls                   # Should show: client/, server/, package.json, README.md
  cd client && ls      # Should show: src/, package.json, vite.config.ts
  cd ../server && ls   # Should show: src/, prisma/, package.json
  cd ..
  ```

---

## Phase 3: Environment Setup (2 min)

- [ ] **Create server .env file**
  ```powershell
  ni server\.env
  # Or use: New-Item -Path "server\.env" -ItemType File
  ```

- [ ] **Add database credentials**
  ```env
  DATABASE_URL="postgresql://postgres:password@localhost:5432/chatstream"
  JWT_SECRET="dev-secret-local-only-change-in-production"
  JWT_EXPIRES_IN="7d"
  PORT=3001
  NODE_ENV=development
  CLIENT_URL="http://localhost:5173"
  CLOUDINARY_CLOUD_NAME="your-cloud-name"
  CLOUDINARY_API_KEY="your-api-key"
  CLOUDINARY_API_SECRET="your-api-secret"
  ```

- [ ] **Create client .env file** (optional, defaults work)
  ```powershell
  ni client\.env
  ```

  ```env
  VITE_API_URL="http://localhost:3001"
  ```

- [ ] **See [ENV_REFERENCE.md](./ENV_REFERENCE.md)** for detailed variable info

---

## Phase 4: Database Setup (3 min)

- [ ] **Create PostgreSQL database**
  ```powershell
  psql -U postgres -c "CREATE DATABASE chatstream;"
  ```
  
  Or via pgAdmin if you prefer GUI

- [ ] **Navigate to server**
  ```bash
  cd server
  ```

- [ ] **Push Prisma schema**
  ```bash
  npm run db:push
  ```
  
  Expected output: `✓ Prisma schema pushed to database`

- [ ] **Verify tables created**
  ```powershell
  psql -U postgres -d chatstream -c "\dt"
  ```
  
  Should show: User, Server, ServerMember, Channel, Message, etc.

---

## Phase 5: Dependencies (2 min)

- [ ] **From root directory**
  ```bash
  cd chatstream    # Ensure you're at root with package.json
  npm run install:all
  ```

  Expected output: 
  - ✓ client dependencies installed
  - ✓ server dependencies installed
  - Total: 440+ packages

- [ ] **Verify installations**
  ```bash
  cd client && npm ls react      # Should show react@18.x.x
  cd ../server && npm ls express # Should show express@4.x.x
  cd ..
  ```

---

## Phase 6: Development Servers (2 min)

- [ ] **Start from root** (in separate terminals)

  **Terminal 1 - Backend:**
  ```bash
  npm run server:dev
  # Or: cd server && npm run dev
  ```
  
  Expected output:
  ```
  Server running on http://localhost:3001
  [Server] Socket.IO server ready
  ```

- [ ] **Terminal 2 - Frontend:**
  ```bash
  npm run client:dev
  # Or: cd client && npm run dev
  ```
  
  Expected output:
  ```
  Local:   http://localhost:5173/
  Network: http://192.x.x.x:5173/
  ```

- [ ] **Both running?**
  - Backend: http://localhost:3001 ✅
  - Frontend: http://localhost:5173 ✅

---

## Phase 7: Verification (2 min)

- [ ] **Open browser**
  ```
  http://localhost:5173
  ```

- [ ] **See landing page** with:
  - ✅ ChatStream logo
  - ✅ Feature list
  - ✅ "Get Started" button

- [ ] **Test registration**
  - Click "Get Started"
  - Fill registration form
  - Create account with test user
  - Should redirect to chat

- [ ] **Verify real-time**
  - Open another browser tab with same URL
  - Send message from first tab
  - Should appear instantly in second tab
  - Type in first tab
  - Should show "typing..." in second tab

- [ ] **Check console**
  - Open DevTools (F12)
  - Console tab: No red errors
  - Network tab: Login request returns 200
  - WebSocket: Should show socket.io connection

---

## Phase 8: File Storage (Optional - 2 min)

- [ ] **Set up Cloudinary account** (free tier)
  - Go to https://cloudinary.com/users/register/free
  - Sign up and log in
  - Go to Dashboard (https://console.cloudinary.com)

- [ ] **Get credentials**
  - Copy "Cloud Name" from top
  - Go to Settings → API Keys
  - Copy "API Key"
  - Copy "API Secret"

- [ ] **Update server/.env**
  ```env
  CLOUDINARY_CLOUD_NAME="your-cloud-name"
  CLOUDINARY_API_KEY="your-api-key"
  CLOUDINARY_API_SECRET="your-api-secret"
  ```

- [ ] **Restart backend**
  ```bash
  cd server
  # Ctrl+C (stop current)
  npm run dev    # Start with new env vars
  ```

- [ ] **Test avatar upload**
  - Click user panel (bottom left)
  - Click profile
  - Upload new avatar
  - Should see image load from Cloudinary CDN

---

## Common Issues & Solutions

### Issue: "ECONNREFUSED localhost:5432"
**Problem**: PostgreSQL not running
**Solution**:
```powershell
# Start PostgreSQL service
net start PostgreSQL-x64-14    # Adjust version number
# Or use Services app (services.msc)
```

### Issue: "DATABASE_URL invalid"
**Problem**: Wrong connection string format
**Solution**: Verify format
```env
# Correct format:
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/chatstream"
# Check PASSWORD is the one you set during PostgreSQL install
```

### Issue: "Cannot find module 'react'"
**Problem**: Dependencies not installed
**Solution**:
```bash
npm run install:all    # From root
npm ls               # Verify installations
```

### Issue: "Port 3001 already in use"
**Problem**: Another process using port
**Solution**:
```powershell
# Find process using port 3001
netstat -ano | findstr :3001
# Kill the process
taskkill /PID <PID> /F

# Or use different port:
$env:PORT=3002; npm run server:dev
```

### Issue: "WebSocket keeps reconnecting"
**Problem**: New messages not arriving in real-time
**Solution**:
- Check browser console for errors
- Verify CLIENT_URL on backend matches frontend domain
- Restart both servers
- Clear browser cache (Ctrl+Shift+Delete)

### Issue: "Cloudinary upload fails"
**Problem**: Missing/invalid credentials
**Solution**:
- Verify CLOUDINARY_* variables in `.env`
- Don't expose API_SECRET to client
- Check Cloudinary account is active at https://console.cloudinary.com

---

## What to Do Next

### ✅ Development
- Modify frontend in `client/src/`
- Modify backend in `server/src/`
- Changes auto-reload in dev mode

### 📚 Learn the Code
- Read [README.md](./README.md) - Architecture overview
- Read [ENV_REFERENCE.md](./ENV_REFERENCE.md) - Config details
- Read `client/src/store/` - State management
- Read `server/src/socket/handlers.ts` - Real-time logic

### 🧪 Test
- API endpoints: See [README.md](./README.md#api-endpoints)
- Socket events: See [README.md](./README.md#socket-events)
- Run: `npm run test` (if configured)

### 🚀 Deploy
- See [DEPLOYMENT.md](./DEPLOYMENT.md) - Full guide
- See [DEPLOYMENT_QUICK_REFERENCE.md](./DEPLOYMENT_QUICK_REFERENCE.md) - Quick checklist
- Frontend → Vercel (5 min)
- Backend → Render (10 min)

---

## Troubleshooting Commands

```powershell
# Check Node.js & npm
node --version
npm --version

# Check PostgreSQL
pg_isready -h localhost
psql -U postgres -d chatstream -c "SELECT 1"

# Check if ports are free
netstat -ano | findstr :3001      # Backend
netstat -ano | findstr :5173      # Frontend

# Clear npm cache (if install hangs)
npm cache clean --force

# Reinstall dependencies
rm -r node_modules package-lock.json
npm install

# Check environment variables
# PowerShell - show all env vars
Get-ChildItem env: | Where-Object { $_.Name -like '*DATABASE*' }
```

---

## Success Criteria ✅

You're ready to develop when:
- [ ] PostgreSQL running at localhost:5432
- [ ] Backend server running at localhost:3001
- [ ] Frontend running at localhost:5173
- [ ] Can register new user
- [ ] Can log in successfully
- [ ] Can send + receive messages in real-time
- [ ] Typing indicators working
- [ ] Can create servers and channels
- [ ] Console has no red errors
- [ ] Avatar upload to Cloudinary works (optional)

---

## Next Steps

1. **Explore the UI** - Create servers, channels, send messages
2. **Read the code** - Understand React components and Express routes
3. **Make changes** - Modify features (UI, logic, database)
4. **Test in browser** - Verify changes work
5. **Deploy** - Follow [DEPLOYMENT.md](./DEPLOYMENT.md) when ready

---

**Stuck?** Check:
1. This checklist (common solutions above)
2. [ENV_REFERENCE.md](./ENV_REFERENCE.md#troubleshooting) - More detailed troubleshooting
3. Browser DevTools Console (F12)
4. Server terminal output (check for errors)

**Questions?** File an issue or check the main [README.md](./README.md)
