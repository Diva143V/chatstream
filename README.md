# ChatStream — Discord-style Chat App

A full-stack real-time chat application built with modern technologies.

> 📚 **[Complete Documentation Index](./DOCUMENTATION_INDEX.md)** — Start here to find the right guide for your needs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| State | Zustand (replaces Context/useReducer) |
| Routing | React Router v6 |
| HTTP | Axios with JWT interceptors |
| Real-time | Socket.IO |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT + bcryptjs |
| Storage | Cloudinary |
| Hosting | Vercel (frontend) + Render/Fly.io (backend) |

## Project Structure

```
chatstream/
├── client/                     # Frontend (Vite + React)
│   └── src/
│       ├── api/
│       │   └── axios.ts         ← Axios instance with JWT interceptors
│       ├── components/
│       │   ├── ServerBar.tsx    ← Left icon bar (server list)
│       │   ├── Sidebar.tsx      ← Channel list + user panel
│       │   ├── ChatArea.tsx     ← Message display with grouping & infinite scroll
│       │   ├── MessageInput.tsx ← Auto-resize textarea with typing indicators
│       │   ├── MembersPanel.tsx ← Right panel (members by status)
│       │   └── UserPanel.tsx    ← Bottom user info + quick actions
│       ├── hooks/
│       │   ├── useSocket.ts     ← Socket.IO hook (singleton)
│       │   └── useMessages.ts   ← Fetching + message grouping logic
│       ├── pages/
│       │   ├── Landing.tsx      ← Marketing landing page
│       │   ├── Login.tsx        ← Animated login form
│       │   ├── Register.tsx     ← Register form
│       │   └── App.tsx          ← Authenticated main layout
│       ├── store/
│       │   ├── useAuthStore.ts  ← Auth state (Zustand + persist)
│       │   ├── useServerStore.ts ← Servers & channels
│       │   ├── useMessageStore.ts ← Messages per channel (paginated)
│       │   └── useUIStore.ts    ← UI state (panels, modals, typing)
│       └── types/
│           └── index.ts         ← Shared TypeScript types
│
└── server/                      # Backend (Node.js + Express)
    ├── prisma/
    │   └── schema.prisma        ← Full DB schema
    └── src/
        ├── lib/
        │   ├── prisma.ts        ← Prisma client singleton
        │   └── cloudinary.ts    ← Cloudinary + Multer setup
        ├── middleware/
        │   └── auth.ts          ← JWT authenticate middleware
        ├── routes/
        │   ├── auth.ts          ← Register, login, me, profile, avatar
        │   ├── servers.ts       ← CRUD servers + channels
        │   ├── messages.ts      ← Paginated messages + reactions
        │   └── friends.ts       ← Friends + DMs
        ├── socket/
        │   └── handlers.ts      ← All Socket.IO event handlers
        └── index.ts             ← Express + Socket.IO server
```

## Quick Start

**📋 Follow [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md) for step-by-step setup (15 minutes)**

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Cloudinary account (optional, for file uploads)

### 1. Clone & Install

```bash
git clone <repo>
cd chatstream
npm install:all
```

### 2. Configure Environment

```bash
# Server
cp server/.env.example server/.env
# Fill in: DATABASE_URL, JWT_SECRET, CLOUDINARY_*
```

For detailed environment variable setup, see **[ENV_REFERENCE.md](./ENV_REFERENCE.md)**
- ✅ All variable descriptions & examples
- ✅ Development vs Production values
- ✅ Security best practices
- ✅ Troubleshooting guide

### 3. Set up Database

```bash
cd server
npm run db:push       # Push schema to DB
npm run db:generate   # Generate Prisma client
npm run db:seed       # (optional) seed sample data
```

### 4. Run Development

```bash
# From root
npm run dev

# Or individually:
cd server && npm run dev   # http://localhost:3001
cd client && npm run dev   # http://localhost:5173
```

## Key Architecture Decisions

### Zustand over Context + useReducer
- **Simpler** — no Provider wrapping, direct imports
- **Performant** — components only re-render on subscribed slice changes
- **Persistent** — auth state persists via `zustand/middleware/persist`
- **Devtools** — compatible with Redux DevTools

### Socket.IO Singleton
The `useSocket` hook reuses a single socket connection across the app. Reconnect logic, event listeners, and status sync are all centralized.

### Message Store with Pagination
Messages are stored per-channel (`messagesByChannel: Record<channelId, Message[]>`). Infinite scroll loads older messages prepending to the array. Deduplication prevents race conditions between REST and socket.

### Message Grouping (memoized)
Consecutive messages from the same author within 5 minutes are grouped into `MessageGroup` objects. This is computed with `useMemo` inside `useChannelMessages` — never inside the render.

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login + get JWT |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/profile` | Update profile |
| POST | `/api/auth/avatar` | Upload avatar (Cloudinary) |
| POST | `/api/auth/logout` | Logout (set OFFLINE) |

### Servers
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/servers` | List user's servers |
| POST | `/api/servers` | Create server |
| GET | `/api/servers/:id` | Get server details |
| POST | `/api/servers/:id/channels` | Create channel |
| POST | `/api/servers/join/:inviteCode` | Join server |

### Messages
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/messages/channel/:id` | Get paginated messages |
| POST | `/api/messages/channel/:id` | Send message |
| PATCH | `/api/messages/:id` | Edit message |
| DELETE | `/api/messages/:id` | Delete message |
| POST | `/api/messages/:id/reactions` | Toggle reaction |

### Friends
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/friends` | List friends |
| POST | `/api/friends` | Send friend request |
| PATCH | `/api/friends/:id` | Accept/decline |
| DELETE | `/api/friends/:id` | Remove friend |
| GET | `/api/friends/dms` | List DMs |
| POST | `/api/friends/dms` | Open/create DM |

## Socket Events

### Client → Server
| Event | Payload |
|-------|---------|
| `channel:join` | `channelId` |
| `channel:leave` | `channelId` |
| `message:send` | `{ channelId, content }` |
| `message:edit` | `{ messageId, content }` |
| `message:delete` | `{ messageId, channelId }` |
| `message:react` | `{ messageId, emoji }` |
| `typing:start` | `channelId` |
| `typing:stop` | `channelId` |
| `dm:join` | `dmId` |
| `dm:send` | `{ dmId, content }` |

### Server → Client
| Event | Payload |
|-------|---------|
| `message:new` | `Message` |
| `message:updated` | `Message` |
| `message:deleted` | `{ id, channelId }` |
| `message:reactions_updated` | `{ messageId, reactions, channelId }` |
| `user:status` | `{ userId, status }` |
| `typing:start` | `{ userId, username, channelId }` |
| `typing:stop` | `{ userId, channelId }` |
| `dm:message` | `Message` |

## Deployment

**📖 See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive instructions.**

**⚡ Quick Reference: [DEPLOYMENT_QUICK_REFERENCE.md](./DEPLOYMENT_QUICK_REFERENCE.md)**

**🧪 Testing Guide: [TESTING_GUIDE.md](./TESTING_GUIDE.md)**

### Frontend → Vercel (5 minutes)

Install Vercel CLI:
```bash
npm install -g vercel
```

Deploy:
```bash
cd client
vercel --prod
```

Configure in Vercel dashboard:
```
VITE_API_URL=https://your-backend.onrender.com
```

### Backend → Render (10 minutes)

1. **Create PostgreSQL**: Dashboard → New → PostgreSQL
2. **Create Web Service**:
   - Build: `cd server && npm install && npm run build`
   - Start: `cd server && npm start`
3. **Add Environment Variables**:
   - DATABASE_URL (from PostgreSQL)
   - JWT_SECRET (generate secure random)
   - NODE_ENV=production
   - CLIENT_URL, CLOUDINARY_*

4. **Initialize Database**:
   ```bash
   npm run db:push
   ```

### Post-Deployment

- ✅ Test API: `curl https://your-api.onrender.com/health`
- ✅ Test WebSocket connection
- ✅ Verify avatar upload to Cloudinary
- ✅ Monitor Vercel Analytics & Render Logs

See complete deployment guide: [**DEPLOYMENT.md**](./DEPLOYMENT.md)
