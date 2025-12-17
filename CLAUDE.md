# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the backend server (port 3001)
pnpm --filter @nofus/server dev

# Build shared types package
pnpm --filter @nofus/shared build

# Type check specific package
pnpm --filter @nofus/server typecheck
pnpm --filter @nofus/shared typecheck
```

## Documentation

Read the `/docs` folder before implementing features:
- **SPEC.md** - Game mechanics, lifecycle, scoring rules, and phase descriptions
- **NETWORK_PROTOCOL.md** - WebSocket message envelope format and routing examples
- **CRITIQUE_AND_PROPOSAL.md** - Architecture decisions, trade-offs, and recommended data structures

## Architecture Overview

This is a Jackbox-style party game ("N Of Us Are Lying") using a **host-authoritative architecture**.

### Monorepo Structure

- **apps/server** - Bun-based WebSocket relay server
- **apps/web** - React client (Host + Player views) - not yet implemented
- **packages/shared** - Zod schemas, TypeScript types, game constants

### Key Architectural Decisions

**Host-Authoritative State**: The Host client (desktop browser) manages all game state and rules. The backend is a "dumb pipe" that only routes messages between Host and Players. This allows game rules to change without backend modifications.

**Message Routing**: All WebSocket messages follow the `NetworkMessage` envelope with a `target` field:
- `target: "HOST"` - Route to host socket
- `target: "ALL"` - Broadcast to all players
- `target: "player_123"` - Route to specific player

The server injects `senderId` before forwarding messages.

### Server Endpoints

- `POST /api/v1/rooms` - Create room, returns `{ roomCode, hostToken }`
- `GET /api/v1/rooms/:code/ws` - WebSocket upgrade (query params: `role`, `token`, `name`, `playerId`)

### Type Sharing

Import shared types from `@nofus/shared`:
```typescript
import { GameState, Player, MessageTypes, NetworkMessage } from '@nofus/shared';
```

All types have corresponding Zod schemas for runtime validation (e.g., `PlayerSchema`, `GameStateSchema`).
