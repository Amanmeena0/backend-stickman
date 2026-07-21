# Stickman Battle Backend

A lightweight, high-performance, authoritative multiplayer real-time game server built with Node.js, Express, Socket.IO, TypeScript, and Zod.

## Features

- ⚡ **60 FPS Authoritative Server Loop**: Server controls physics, collisions, combat, damage, and round states. Clients send only inputs.
- 🥊 **Player vs Player & Player vs Bot Modes**: Full support for 2-player real-time online matches or single-player bot matches with server-side AI.
- 🛡️ **Built-in Security & Anti-Cheat**: Zod schema payload validation, socket rate limiting (packet throttling), room code guessing protection, state sanity checks.
- 🔄 **Auto Reconnect & Graceful Disconnect Handling**: Session tokens allow players to seamlessly reconnect within a 15-second window.
- 🧹 **Automatic Room Cleanup**: In-memory store with periodic sweeping of inactive/empty rooms.
- 📊 **Monitoring & Health Check**: Built-in `/health`, `/metrics`, and `/rooms` REST endpoints.
- 🐳 **Production Ready**: Docker multi-stage build & docker-compose support, easy 1-click deployment to Railway, Render, and Fly.io.

---

## Tech Stack

- **Runtime**: Node.js & TypeScript
- **Web Framework**: Express
- **Realtime Networking**: Socket.IO v4
- **Validation**: Zod
- **Security & Utilities**: Helmet, CORS, Morgan, Compression, NanoID, UUID, dotenv
- **Testing**: Jest & Socket.IO Client

---

## Architecture

Feature-based modular architecture adhering to SOLID principles:

```
src/
├── config/             # Environment & Game Constants
├── controllers/        # REST Health & Monitoring Controllers
├── game/               # Physics Engine, Combat Engine, Bot AI, 60 FPS Game Loop
├── middleware/         # Security, Rate Limiting & Error Handling
├── rooms/              # In-Memory Room & RoomManager Entities
├── socket/             # Socket.IO Event Handlers & Zod Validators
│   └── handlers/       # Room, Game & Heartbeat Event Handlers
├── types/              # Game, Room & Socket Interfaces
├── utils/              # Structured Logger, 2D Vector Math, Rate Limiter, NanoID
├── app.ts              # Express App setup
└── server.ts           # Server entrypoint with Graceful Shutdown
```

---

## Getting Started

### Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Run Dev Server**:
   ```bash
   npm run dev
   ```

4. **Run Tests**:
   ```bash
   npm test
   ```

5. **Build for Production**:
   ```bash
   npm run build
   npm start
   ```

---

## Socket Events API

### Incoming Events (Client -> Server)

| Event | Payload | Description |
|---|---|---|
| `create-room` | `{ nickname: string, mode?: 'pvp' \| 'bot' }` | Create a new room |
| `join-room` | `{ roomCode: string, nickname: string }` | Join room by 6-char code |
| `reconnect-player` | `{ roomId: string, reconnectToken: string, nickname: string }` | Reconnect to active room |
| `leave-room` | - | Leave current room |
| `move` | `{ direction: -1 \| 0 \| 1 }` | Horizontal move input |
| `jump` | - | Trigger jump input |
| `attack` | - | Trigger attack action |
| `ready` | - | Signal player readiness |
| `pause` | - | Pause game (Dev/Debug) |
| `resume` | - | Resume game (Dev/Debug) |
| `ping` | `{ clientTimestamp: number }` | Latency ping |

### Outgoing Events (Server -> Client)

| Event | Payload | Description |
|---|---|---|
| `room-created` | `{ roomId, roomCode, playerId, reconnectToken, playerIndex, gameState }` | Emitted when room created |
| `room-joined` | `{ roomId, roomCode, playerId, reconnectToken, playerIndex, gameState }` | Emitted on room join |
| `player-joined` | `{ playerId, nickname, playerIndex, ready }` | Broadcast to other player |
| `player-left` | `{ playerId, nickname, reason }` | Broadcast when player leaves |
| `game-start` | `{ gameState }` | Round countdown started |
| `state-update` | `{ gameState: DeltaGameState }` | 60 FPS state delta update |
| `player-hit` | `{ attackerId, victimId, damage, remainingHealth, position }` | Hit event notification |
| `health-update` | `{ playerId, health, maxHealth }` | Health change notification |
| `round-over` | `{ winnerId, round, scores }` | Round ended notification |
| `match-over` | `{ winnerId, scores }` | Match complete notification |
| `pong` | `{ clientTimestamp, serverTimestamp, latency }` | Latency measurement response |
| `error` | `{ code, message }` | Validation or system error |

---

## Deployment Options

### Docker Deployment
```bash
docker-compose up --build -d
```

### Deploying to Railway
1. Fork or push this repository to GitHub.
2. Select **New Project** -> **Deploy from GitHub Repo** on Railway.
3. Railway automatically detects the `Dockerfile` and builds the service.

### Deploying to Render
1. Create a new **Web Service** on Render.
2. Connect your GitHub repository.
3. Select **Docker** environment.
4. Set Environment Variables: `PORT=3000`, `NODE_ENV=production`.

### Deploying to Fly.io
```bash
fly launch
fly deploy
```

---

## License

MIT
