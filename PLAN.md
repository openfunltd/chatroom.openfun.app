# Project Plan

## Vision

Build a lightweight, self-hosted WebSocket chatroom service that acts as a **shared real-time backend** for multiple independent applications. Rather than reimplementing presence, messaging, and state synchronization in every project, teams point their apps at a single chatroom instance and get all of that for free.

## Goals

### Core Service
- [x] WebSocket endpoint (`/ws`) with a clean JSON protocol
- [x] Instant room creation — any room name is created on first join, destroyed on last leave
- [x] Per-user metadata (`meta`) — arbitrary key-value store synced to all room members
- [x] Message history — last 100 events replayed to new joiners for state recovery
- [x] Optional room-level password protection
- [x] 30-second heartbeat to detect and clean up dead connections
- [x] REST API (`/api/rooms`, `/api/health`) for external monitoring

### Developer Experience
- [x] Public API documentation served at `/API.md`
- [x] Built-in web UI at `/` for manual testing without any client code
- [x] Docker + Docker Compose deployment with Traefik TLS labels
- [x] All config via environment variables (port, history size, WS path)
- [x] BSD 2-Clause open-source license

### Multi-Application Design
The service is intentionally application-agnostic. The `say` payload and `meta` fields are free-form JSON, so any application can layer its own protocol on top:

| Application type | Uses `meta` for | Uses `say` for |
|---|---|---|
| Chat app | Avatar, display name, status | Chat messages |
| Multiplayer game | Character position, HP, appearance | Actions, attacks, events |
| Collaborative editor | Cursor position, selection | Document operations |
| Presence indicator | User info, online status | Activity pings |

## Roadmap

### Near-term
- [ ] Rate limiting per connection (prevent message flooding)
- [ ] Configurable max members per room
- [ ] `kick` / `ban` capability for room creators

### Future consideration
- [ ] Optional Redis adapter for horizontal scaling across multiple instances
- [ ] Webhook support — POST to a URL on room events (join, leave, say)
- [ ] Admin UI for monitoring active rooms and connections
