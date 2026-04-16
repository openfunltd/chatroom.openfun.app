# Chatroom API Integration Guide

A shared WebSocket chatroom service for multiple applications. Connect any project to real-time rooms with user metadata and message history.

**Production endpoint**: `wss://chatroom.openfun.app/ws`
**REST API**: `https://chatroom.openfun.app/api`

---

## Quick Start

```javascript
const ws = new WebSocket('wss://chatroom.openfun.app/ws')

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'join',
    room: 'my-app-lobby',
    username: 'alice',
    meta: { color: '#ff6b6b' }
  }))
}

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  switch (msg.type) {
    case 'joined':
      console.log('My userId:', msg.userId)
      console.log('Current members:', msg.members)
      console.log('Message history:', msg.history)
      break
    case 'user-joined':
      console.log(`${msg.username} joined`, msg.meta)
      break
    case 'say':
      console.log(`[${msg.username}]`, msg.payload)
      break
    case 'meta-updated':
      console.log(`${msg.username} updated meta:`, msg.meta)
      break
    case 'user-left':
      console.log(`${msg.username} left`)
      break
    case 'error':
      console.error(msg.code, msg.message)
      break
  }
}
```

---

## Concepts

### Rooms
- Room names match `[a-z0-9-]+` and are case-insensitive (normalized to lowercase)
- Rooms are created automatically on first join; deleted automatically when last user leaves
- Rooms can optionally have a password set by the first user who creates them
- Max room name length: 64 characters

### Users
- Each WebSocket connection gets a unique `userId` (UUID v4)
- `userId` is the stable identity — display names (`username`) are not unique
- Users belong to exactly one room per connection

### Meta
- Arbitrary key-value store per user, visible to all room members
- Set at join time and updated any time via `set-meta`
- Updates are **partial merges** — send only the fields you want to change
- Special key: `name` — if set via `set-meta`, also updates the user's displayed `username`

### Message History
- The last 100 `say` events per room are replayed to new joiners in the `joined` message
- Useful for syncing game state, chat backlog, or any recent events

---

## Client → Server Messages

All messages are JSON objects with a `type` field.

### `join`

Must be the first message sent. Joins or creates a room.

```json
{
  "type": "join",
  "room": "my-room",
  "username": "alice",
  "password": "secret123",
  "meta": {
    "avatar": "https://example.com/avatar.png",
    "color": "#ff6b6b"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `room` | string | Yes | Room name `[a-z0-9-]+` |
| `username` | string | Yes | Display name (not unique) |
| `password` | string | No | Required only if room is password-protected |
| `meta` | object | No | Initial user metadata |

### `say`

Broadcast a message or event to all room members (including yourself). The `payload` is stored in history.

```json
{
  "type": "say",
  "payload": {
    "type": "chat",
    "text": "Hello everyone!"
  }
}
```

The inner `payload` is completely free-form. Use a `type` subfield to distinguish event kinds in your application:

```json
{ "type": "say", "payload": { "type": "move", "x": 120, "y": 45 } }
{ "type": "say", "payload": { "type": "reaction", "emoji": "👍" } }
{ "type": "say", "payload": { "type": "draw", "points": [[0,0],[10,10]] } }
```

### `set-meta`

Update your user metadata. Partial merge — only provided keys are updated.

```json
{
  "type": "set-meta",
  "meta": {
    "color": "#00ff00",
    "position": { "x": 200, "y": 100 }
  }
}
```

To rename yourself, set the `name` key:
```json
{ "type": "set-meta", "meta": { "name": "bob" } }
```

---

## Server → Client Messages

### `joined`

Sent only to the joining user on successful join.

```json
{
  "type": "joined",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "room": "my-room",
  "members": [
    { "userId": "...", "username": "alice", "meta": { "color": "#ff6b6b" } }
  ],
  "history": [
    {
      "userId": "...",
      "username": "alice",
      "timestamp": "2026-04-07T12:00:00.000Z",
      "payload": { "type": "chat", "text": "Hello!" }
    }
  ]
}
```

### `user-joined`

Broadcast to all **existing** members when a new user joins.

```json
{
  "type": "user-joined",
  "userId": "...",
  "username": "bob",
  "meta": { "color": "#3498db" },
  "timestamp": "2026-04-07T12:01:00.000Z"
}
```

### `user-left`

Broadcast to remaining members when someone disconnects.

```json
{
  "type": "user-left",
  "userId": "...",
  "username": "bob",
  "timestamp": "2026-04-07T12:05:00.000Z"
}
```

### `say`

Broadcast to **all** room members (including the sender) when someone calls `say`.

```json
{
  "type": "say",
  "userId": "...",
  "username": "alice",
  "timestamp": "2026-04-07T12:02:00.000Z",
  "payload": { "type": "chat", "text": "Hello!" }
}
```

### `meta-updated`

Broadcast to **all** room members when someone calls `set-meta`.

```json
{
  "type": "meta-updated",
  "userId": "...",
  "username": "alice",
  "meta": { "color": "#ff6b6b", "position": { "x": 10, "y": 20 } },
  "timestamp": "2026-04-07T12:03:00.000Z"
}
```

Note: `meta` contains the user's **full** merged metadata, not just the changed fields.

### `error`

Sent when an operation fails. The connection stays open — the client may retry.

```json
{
  "type": "error",
  "code": "WRONG_PASSWORD",
  "message": "Incorrect password."
}
```

| Code | Meaning |
|---|---|
| `INVALID_ROOM_NAME` | Room name doesn't match `[a-z0-9-]+` or exceeds 64 chars |
| `WRONG_PASSWORD` | Room exists and the password is wrong (or missing) |
| `NOT_IN_ROOM` | Tried to `say` or `set-meta` without joining first |
| `ALREADY_JOINED` | Tried to `join` again on the same connection |
| `INVALID_MESSAGE` | JSON parse failure or unrecognized message format |
| `USERNAME_REQUIRED` | `username` was missing or empty in a `join` message |

---

## REST API

### `GET /api/health`

```json
{ "status": "ok", "uptime": 12345.67 }
```

### `GET /api/rooms`

Returns all active rooms (rooms with at least one member).

```json
[
  {
    "name": "my-room",
    "memberCount": 3,
    "hasPassword": false,
    "createdAt": "2026-04-07T12:00:00.000Z",
    "members": [
      { "userId": "...", "username": "alice", "meta": {} }
    ]
  }
]
```

### `GET /api/rooms/:name`

Returns a single room or `404`.

---

## Application Examples

### Simple Chat

```javascript
// Send a chat message
ws.send(JSON.stringify({
  type: 'say',
  payload: { type: 'chat', text: 'Hello!' }
}))

// Receive
if (msg.type === 'say' && msg.payload.type === 'chat') {
  appendMessage(msg.username, msg.payload.text)
}
```

### MMORPG Position Sync

```javascript
// Set initial character state
ws.send(JSON.stringify({
  type: 'join',
  room: 'world-map-1',
  username: 'Hero123',
  meta: {
    avatar: 'warrior',
    position: { x: 0, y: 0 },
    hp: 100
  }
}))

// Move character
ws.send(JSON.stringify({
  type: 'set-meta',
  meta: { position: { x: 120, y: 45 } }
}))

// Broadcast attack action
ws.send(JSON.stringify({
  type: 'say',
  payload: { type: 'attack', targetId: '...', damage: 25 }
}))
```

### Collaborative Whiteboard

```javascript
// Draw stroke
ws.send(JSON.stringify({
  type: 'say',
  payload: {
    type: 'stroke',
    color: '#000',
    width: 2,
    points: [[10, 10], [20, 30], [40, 50]]
  }
}))

// Replay board state on join from history
if (msg.type === 'joined') {
  for (const entry of msg.history) {
    if (entry.payload.type === 'stroke') {
      drawStroke(entry.payload)
    }
  }
}
```

### Presence Indicators

```javascript
// Track who is online in a document editor
ws.send(JSON.stringify({
  type: 'join',
  room: 'doc-' + documentId,
  username: currentUser.name,
  meta: {
    avatar: currentUser.avatarUrl,
    cursor: null
  }
}))

// Broadcast cursor position
document.addEventListener('mousemove', (e) => {
  ws.send(JSON.stringify({
    type: 'set-meta',
    meta: { cursor: { x: e.clientX, y: e.clientY } }
  }))
})
```

---

## Notes

- **Reconnection**: Each connection gets a new `userId`. Store your app-level user identity in `meta` (e.g., `meta.userId`) if you need to correlate reconnections.
- **Room passwords**: The password is set by the first user to create the room. If a room was created without a password, it cannot be password-protected later (and vice versa).
- **Data persistence**: All data is in-memory. Server restarts clear all rooms and history.
- **History limit**: Last 100 `say` events per room are kept and replayed to new joiners.
- **Heartbeat**: The server sends WebSocket pings every 30 seconds. Clients that don't respond are disconnected automatically.
