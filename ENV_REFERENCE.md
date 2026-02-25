# Environment Variables Reference

Complete reference for all environment variables in ChatStream.

## Development Environment

### Server `.env` (Development)

```env
# Database (local PostgreSQL)
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/chatstream"

# JWT Configuration
JWT_SECRET="dev-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=3001
NODE_ENV=development
CLIENT_URL="http://localhost:5173"

# Cloudinary (Image/File Storage)
CLOUDINARY_CLOUD_NAME="dc02w36gr"
CLOUDINARY_API_KEY="579729161381888"
CLOUDINARY_API_SECRET="FSyC5khoAyfICoHCfkOVC2Woea4"
```

### Client `.env` (Development - Vite)

```env
# API Base URL (Vite prefix: VITE_)
VITE_API_URL="http://localhost:3001"
```

---

## Production Environment

### Backend (Render)

```env
# Database (Managed PostgreSQL on Render)
DATABASE_URL="postgresql://chatstream:PASSWORD@dpg-xxxx.render.internal:5432/chatstream"

# JWT Configuration
JWT_SECRET="[STRONG_RANDOM_SECRET_32_CHARS]"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=10000
NODE_ENV="production"
CLIENT_URL="https://chatstream.vercel.app"

# Cloudinary
CLOUDINARY_CLOUD_NAME="dc02w36gr"
CLOUDINARY_API_KEY="579729161381888"
CLOUDINARY_API_SECRET="FSyC5khoAyfICoHCfkOVC2Woea4"
```

### Frontend (Vercel)

```env
# API Base URL
VITE_API_URL="https://chatstream-api.onrender.com"
```

---

## Environment Variable Descriptions

### Database

**DATABASE_URL**
- **Description**: PostgreSQL connection string
- **Format**: `postgresql://user:password@host:port/database`
- **Development**: `postgresql://postgres:230107@localhost:5432/chatstream`
- **Production**: Provided by Render PostgreSQL service
- **Required**: Yes

### JWT (Authentication)

**JWT_SECRET**
- **Description**: Secret key for signing JWT tokens
- **Length**: Minimum 32 characters (recommended)
- **Generation**: 
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Security**: 
  - Never commit to git
  - Change regularly in production
  - Different per environment
- **Required**: Yes

**JWT_EXPIRES_IN**
- **Description**: JWT token expiration time
- **Format**: Can be number (milliseconds) or string (e.g., "7d", "24h", "2h")
- **Default**: "7d" (7 days)
- **Recommended**: "7d" for web apps, "24h" for mobile
- **Required**: No (defaults to 7 days)

### Server

**PORT**
- **Description**: Server listening port
- **Development**: 3001 (default, must match Vite proxy config)
- **Production**: 10000 (Render default), don't hardcode, use `process.env.PORT`
- **Required**: No (defaults to 3001)

**NODE_ENV**
- **Description**: Environment indicator
- **Values**: "development" | "production" | "test"
- **Impact**: Logging, error messages, optimizations
- **Development**: "development"
- **Production**: "production"
- **Required**: Yes

**CLIENT_URL**
- **Description**: Frontend URL for CORS, WebSocket origin
- **Development**: "http://localhost:5173"
- **Production**: "https://chatstream.vercel.app" (or custom domain)
- **Used for**: 
  - CORS whitelist
  - WebSocket origin validation
  - OAuth redirects
- **Required**: Yes

### Cloudinary (File Storage)

**CLOUDINARY_CLOUD_NAME**
- **Description**: Cloudinary account identifier
- **Example**: "dc02w36gr"
- **Where to find**: https://console.cloudinary.com → Dashboard (top of page)
- **Used for**: 
  - Avatar uploads
  - Message attachments
  - Image transformations
- **Required**: Yes (if file upload enabled)

**CLOUDINARY_API_KEY**
- **Description**: Cloudinary API key for server-side uploads
- **Format**: Numeric string
- **Example**: "579729161381888"
- **Where to find**: https://console.cloudinary.com → Settings → API Keys
- **Security**: Server-side only, do NOT expose to client
- **Required**: Yes (if file upload enabled)

**CLOUDINARY_API_SECRET**
- **Description**: Cloudinary API secret for server-side operations
- **Format**: Complex alphanumeric string
- **Security**: 
  - NEVER expose to client
  - NEVER commit to git
  - Treat like database password
  - Rotate periodically
  - Use Render secrets, not plain .env
- **Where to find**: https://console.cloudinary.com → Settings → API Keys
- **Used for**: File uploads, CDN operations
- **Required**: Yes (if file upload enabled)

### Frontend (Vite)

**VITE_API_URL** (with VITE_ prefix required)
- **Description**: Backend API base URL for frontend requests
- **Format**: Full URL including protocol
- **Development**: "http://localhost:3001"
- **Production**: "https://chatstream-api.onrender.com"
- **Usage**: Imported in frontend via `import.meta.env.VITE_API_URL`
- **CORS**: Must match `CLIENT_URL` on backend
- **WebSocket**: Same domain/port as API_URL
- **Required**: Yes

---

## Examples

### Local Development (Windows PowerShell)

```powershell
# Create .env in server directory
$env_content = @"
DATABASE_URL="postgresql://postgres:230107@localhost:5432/chatstream"
JWT_SECRET="dev-key-local-only"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=development
CLIENT_URL="http://localhost:5173"
CLOUDINARY_CLOUD_NAME="dc02w36gr"
CLOUDINARY_API_KEY="579729161381888"
CLOUDINARY_API_SECRET="FSyC5khoAyfICoHCfkOVC2Woea4"
"@

$env_content | Out-File -FilePath "server/.env" -Encoding UTF8
```

### Production (Bash - for Render)

```bash
# Generate strong JWT secret
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Get database URL from Render PostgreSQL service
DATABASE_URL="postgresql://chatstream:PASSWORD@dpg-xxx.render.internal:5432/chatstream"

# Set all variables (Render dashboard or CLI)
# render env set JWT_SECRET="$JWT_SECRET"
# render env set DATABASE_URL="$DATABASE_URL"
# ... etc
```

---

## Security Best Practices

### Secrets Management

✅ **DO:**
- Generate random JWT_SECRET (32+ chars)
- Store secrets in Render environment variables, NOT in .env file
- Rotate secrets periodically (monthly recommended)
- Use different secrets per environment
- Keep Cloudinary API_SECRET private

❌ **DON'T:**
- Commit `.env` files to git
- Hardcode secrets in code
- Use same secret in dev/prod
- Share secrets in Slack/email
- Use weak/guessable secrets
- Expose API_SECRET to client-side code

### Environment-Specific Variables

| Variable | Local | Vercel | Render Note |
|----------|-------|--------|-------------|
| DATABASE_URL | Local DB | N/A | Render DB URL |
| JWT_SECRET | Dev key | N/A | Strong random |
| NODE_ENV | development | N/A | production |
| CLIENT_URL | localhost | Frontend URL | Must match Vercel |
| VITE_API_URL | localhost:3001 | Render URL | N/A (frontend) |
| CLOUDINARY_* | Account creds | N/A | Same everywhere |

---

## Troubleshooting

### "Cannot find module 'cloudinary'"
**Cause**: Cloudinary npm package not installed
**Solution**: Run `npm install cloudinary multer-storage-cloudinary`

### "ECONNREFUSED - connect ECONNREFUSED 127.0.0.1:5432"
**Cause**: DATABASE_URL incorrect or PostgreSQL not running
**Solution**: 
- Verify DATABASE_URL format
- Start PostgresSQL service
- Test connection: `psql "postgresql://..."`

### "invalid token" on Socket.IO connection
**Cause**: Invalid JWT_SECRET or token signed with different secret
**Solution**: 
- Verify JWT_SECRET matches across environments
- Re-login to get new token
- Check token hasn't expired

### "Cannot GET /api/servers"
**Cause**: CLIENT_URL mismatch or backend not running
**Solution**:
- Verify backend is running
- Check CORS: `CLIENT_URL` must match frontend domain
- Verify API endpoint exists

### "VITE_API_URL is undefined"
**Cause**: Missing VITE_ prefix or not in .env
**Solution**:
- Prefix with `VITE_` (required by Vite)
- Add to `.env` file in client directory
- Restart dev server: `npm run dev`

### "WebSocket failed to connect"
**Cause**: Wrong protocol (HTTP vs HTTPS) or origin mismatch
**Solution**:
- Use HTTPS in production (automatic on Vercel/Render)
- Verify CLIENT_URL includes protocol
- Check firewall allows WebSocket port

---

## Verification Scripts

### Test Backend Connection

```bash
# Check database
psql "$DATABASE_URL" -c "SELECT 1;"

# Test JWT validity
node -e "console.log(require('jsonwebtoken').verify('YOUR_TOKEN', process.env.JWT_SECRET))"

# Verify Cloudinary
curl "https://api.cloudinary.com/v1_1/$CLOUDINARY_CLOUD_NAME/image/upload_presets" \
  -u "$CLOUDINARY_API_KEY:$CLOUDINARY_API_SECRET"
```

### Test Frontend Connection

```javascript
// In browser console
console.log(import.meta.env.VITE_API_URL);
// Should output: https://your-api.onrender.com (or localhost:3001)
```

---

## When Variables Change

### Update Backend (Render)

1. Dashboard → Service → Settings → Environment
2. Edit variable
3. Click Save
4. Service auto-redeploys

### Update Frontend (Vercel)

1. Dashboard → Project → Settings → Environment Variables
2. Edit variable
3. Click Save
4. Go to Deployments → Redeploy latest

### Update Local Development

1. Edit `.env` file
2. Restart development server (Ctrl+C, then `npm run dev`)
3. Changes take effect immediately

---

## Summary Table

| Variable | Where | Dev Value | Prod Value | Type |
|----------|-------|-----------|-----------|------|
| DATABASE_URL | Server | localhost | Render URL | string |
| JWT_SECRET | Server | dev-key | random-32-char | string |
| JWT_EXPIRES_IN | Server | 7d | 7d | string |
| PORT | Server | 3001 | 10000 | number |
| NODE_ENV | Server | development | production | enum |
| CLIENT_URL | Server | localhost:5173 | vercel.app | string |
| CLOUDINARY_CLOUD_NAME | Server | dc02w36gr | dc02w36gr | string |
| CLOUDINARY_API_KEY | Server | your-key | your-key | string |
| CLOUDINARY_API_SECRET | Server | your-secret | your-secret | string |
| VITE_API_URL | Client | localhost:3001 | onrender.com | string |

---

**Questions?** See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment guide.
