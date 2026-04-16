# chatroom

A lightweight, self-hosted WebSocket chatroom service designed to be shared across multiple projects. Drop it in as a real-time backend for chat, multiplayer games, collaborative tools, presence indicators, and more.

**Live demo**: https://chatroom.openfun.app

## Features

- **Instant rooms** — any room name is created on demand; deleted automatically when empty
- **User metadata** — attach arbitrary key-value data per user (avatar, color, position, …)
- **Message history** — last 100 events replayed to new joiners
- **Optional room passwords** — set by the first person to create the room
- **REST API** — list rooms and members over HTTP
- **Built-in web UI** — functional chat interface served at `/`

## Quick start (Docker)

```bash
docker run -d \
  --name chatroom \
  --restart unless-stopped \
  -p 3000:3000 \
  ghcr.io/openfun/chatroom:latest
```

Open http://localhost:3000 in your browser.

## Docker Compose

```bash
git clone https://github.com/openfun/chatroom.git
cd chatroom
docker compose up -d
```

The default `docker-compose.yml` includes [Traefik](https://traefik.io) labels for automatic TLS via Let's Encrypt. If you are not using Traefik, remove the `labels` block and configure your own reverse proxy to forward traffic to port 3000.

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP/WebSocket port |
| `WS_PATH` | `/ws` | WebSocket endpoint path |
| `MAX_HISTORY` | `100` | Max messages kept per room |

Copy `.env.example` to `.env` and adjust as needed:

```bash
cp .env.example .env
docker compose up -d
```

`PORT` controls both the host-side and container-side port, so setting `PORT=8080` in `.env` exposes the service on `host:8080`.

## Local development

**Requirements**: Node.js 22+

```bash
npm install
npm run dev        # start with hot-reload on port 3000
```

```bash
npm run build      # compile TypeScript → dist/
npm start          # run compiled output
```

## WebSocket endpoint

Connect to `wss://chatroom.openfun.app/ws` (or `ws://localhost:3000/ws` locally).

### Join a room

```js
const ws = new WebSocket('wss://chatroom.openfun.app/ws')

ws.onopen = () => ws.send(JSON.stringify({
  type: 'join',
  room: 'my-room',
  username: 'alice',
  // password: 'secret',   // only if room is password-protected
  // meta: { color: '#f00', avatar: 'https://...' }
}))
```

### Send a message

```js
ws.send(JSON.stringify({
  type: 'say',
  payload: { type: 'chat', text: 'Hello!' }
}))
```

### Update metadata

```js
ws.send(JSON.stringify({
  type: 'set-meta',
  meta: { color: '#0f0', position: { x: 120, y: 45 } }
}))
```

### Handle incoming events

```js
ws.onmessage = ({ data }) => {
  const msg = JSON.parse(data)
  switch (msg.type) {
    case 'joined':      /* { userId, room, members, history } */   break
    case 'user-joined': /* { userId, username, meta, timestamp } */ break
    case 'user-left':   /* { userId, username, timestamp } */       break
    case 'say':         /* { userId, username, payload, timestamp }*/ break
    case 'meta-updated':/* { userId, username, meta, timestamp } */ break
    case 'error':       /* { code, message } */                     break
  }
}
```

See [API.md](API.md) for the full protocol reference, error codes, and integration examples (MMORPG, collaborative whiteboard, presence indicators).

## REST API

| Endpoint | Description |
|---|---|
| `GET /api/health` | Server health check |
| `GET /api/rooms` | List all active rooms |
| `GET /api/rooms/:name` | Get a single room's info |

## License

[BSD 2-Clause](LICENSE) — © 2026 OpenFun
