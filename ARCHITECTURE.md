## Architecture

This project implements a resilient distributed system using a hybrid client-authority architecture, designed to maintain game state consistency across network partitions while preventing cheating through cryptographic state isolation.

### Technology Stack

**Backend**:
- Bun (JavaScript runtime) - Fast WebSocket server with native TypeScript support
- WebSocket protocol - Bidirectional, real-time communication
- In-memory data structures - Room and player session management

**Frontend**:
- React - Component-based UI framework
- XState - Finite state machine library for deterministic state management
- Web Crypto API - AES-256-GCM encryption for state recovery
- TypeScript - Type-safe message passing and state definitions
- Zod - Runtime schema validation for network messages

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Bun Server)                    │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│  │   Room     │  │   WebSocket  │  │   Player Token   │     │
│  │ Management │  │   Routing    │  │  Authentication  │     │
│  └────────────┘  └──────────────┘  └──────────────────┘     │
└────────────┬────────────────────────────────┬───────────────┘
             │                                │
        WebSocket                        WebSocket
             │                                │
    ┌────────▼────────┐              ┌────────▼───────┐
    │  Host Client    │              │ Player Client  │ (x N)
    │  ┌───────────┐  │              │ ┌────────────┐ │
    │  │  XState   │  │              │ │    View    │ │
    │  │  Machine  │  │              │ │ Projection │ │
    │  │           │  │              │ └────────────┘ │
    │  │  (SSOT)   │  │              │ ┌────────────┐ │
    │  └───────────┘  │              │ │ Encrypted  │ │
    │  ┌───────────┐  │              │ │ Host State │ │
    │  │  State    │◄─┼──────────────┼─┤ (Backup)   │ │
    │  │ Encryption│  │  Recovery    │ └────────────┘ │
    │  └───────────┘  │              └────────────────┘
    └─────────────────┘

State Flow:
  Host: State Change → Encrypt → Broadcast to all players → Player UI Update
  Player: User Action → Send to Backend → Route to Host → State Machine Transition

Recovery Flow:
  Host Crash → Reconnect → Request from Random Player → Decrypt → Restore State
```

### System Architecture

The system consists of three distributed components:

1. **Backend Coordination Service** (Bun + WebSockets)
   - Routes messages between host and players without interpreting game logic
   - Manages WebSocket connections and room lifecycle
   - Handles player authentication via secure tokens

2. **Host Client** (React + XState)
   - Authoritative state manager for all game logic
   - Implements deterministic state machine (XState) for consistency
   - Broadcasts state updates to all connected players
   - Encrypts and distributes recovery checkpoints to players

3. **Player Clients** (React)
   - Thin clients receiving state projections from host
   - Store encrypted host state for disaster recovery
   - Send player actions to host via backend relay

Game state resides on the host client rather than the backend server. This reduces backend complexity and latency (direct state updates without server-side validation), while the cryptographic scheme prevents cheating despite client-side authority. It also allows for easy horizontal scaling of the backend, as it remains stateless, and multiple game types can hosted on the same backend infrastructure.

### Fault Tolerance & Recovery Mechanisms

The system implements multiple layers of resilience against network failures:

#### Host Disconnection Recovery
When the host crashes or disconnects:
1. On reconnection, host queries backend for connected players
2. If players exist, host randomly selects a player for state recovery
3. Host sends `REQUEST_STATE_RECOVERY` message to selected player
4. Player responds with encrypted state snapshot (encrypted with host's secret token)
5. Host decrypts snapshot using its persisted token and restores XState machine
6. Game continues from the exact state before disconnection

#### Player Reconnection
Players maintain persistent sessions across disconnections:
1. Each player receives a unique `reconnectToken` on initial join (stored in `sessionStorage`)
2. On disconnect, backend marks player as disconnected with timestamp
3. Player automatically attempts reconnection with exponential backoff
4. Within 30-second window, player can reconnect using stored `playerId` and `reconnectToken`
5. Host receives `PLAYER_CONNECTED` event and marks player as active again
6. Player receives latest game state snapshot and rejoins seamlessly

Each player/host has random tokens preventing session hijacking

#### Automatic State Synchronization
The host broadcasts state updates on every state transition:
- Host serializes XState machine snapshot (`getPersistedSnapshot()`)
- For each player, creates filtered view showing only information they should see
- Encrypts full state and includes in payload for recovery purposes
- Sends via WebSocket to all connected players
- If WebSocket send fails, state remains in host memory for retry on reconnection

### Consistency Model & State Management

#### Authoritative State Pattern
The system uses **single-writer, multiple-reader** consistency:
- **Host** is the single source of truth (SSOT) for game state in a given room
- **Players** receive read-only projections of state relevant to them
- **All state mutations** flow through host's XState machine (deterministic transitions)
- **Backend** never modifies or interprets game state

This provides **strong consistency** from the host's perspective - all state transitions are serialized through a deterministic state machine, preventing race conditions.

#### Event Sourcing via XState
The host uses XState (finite state machine library) to manage game state:
- Game logic encoded as declarative state transitions and guards
- Every player action becomes an event sent to the state machine
- State transitions are deterministic and testable
- Machine state is fully serializable for checkpointing

**Benefits for distributed systems**:
- Reproducible behavior (same events → same state)
- Easy to reason about distributed state
- Natural checkpoint boundaries (state snapshots)
- Guards prevent invalid state transitions even with network delays

#### Eventual Consistency for Player Views
Players operate under **eventual consistency**:
- Player views lag behind host state by network latency + broadcast time
- Players accept that their view may be slightly stale
- Players never see inconsistent state (atomic state updates from host)
- For player actions (voting, submitting lies), optimistic UI updates with server reconciliation

### Security in a Distributed Context

#### Encrypted State Distribution
To enable host recovery without allowing players to cheat:
1. Host encrypts full state using AES-256-GCM with key derived from host token
2. Encrypted state embedded in every state broadcast to players
3. Players store encrypted state but cannot decrypt it (don't have host token)
4. Only the original host can decrypt its own checkpoints

#### Information Hiding via State Projections
Host sends different state views to different players:
- Players never see other players' articles during research phase
- During voting, players don't see who voted for what until reveal
- Expert identity hidden until submissions complete via delayed reveal timer
- Each player receives only the minimal information needed for their UI

### Scalability Considerations

#### Current Design
- **Room isolation**: Each room is independent (no cross-room communication)
- **In-memory state**: Backend stores rooms in-memory (Map<roomCode, Room>)
- **Stateless backend**: Easy to horizontally scale with sticky sessions
- **Client-side state**: Host manages state, reducing backend CPU/memory

#### Scaling Bottlenecks
1. **Single host per room**: If host has poor connection, all players lag
2. **Backend memory**: Room state grows linearly with player count (mitigated by 1-hour expiry)
3. **WebSocket connections**: Each room needs 1 host + N player connections

#### Potential Optimizations
- Migrate to Redis for room storage (enables multi-backend deployment)
- Implement host migration (transfer authority to player if host consistently poor connection)
- Add state compression for recovery snapshots (currently plaintext JSON)
- WebSocket connection pooling or server-sent events for read-only updates

### CAP Theorem Trade-offs

This system makes specific CAP theorem trade-offs:

**Consistency over Availability**:
- Host disconnection halts game until host recovers or recovery completes
- No automatic failover to player authority (prevents split-brain)
- Players cannot continue playing during host disconnect
- Chose correctness over continuous availability

**Partition Tolerance**:
- Host-player partition: Players marked as disconnected, can rejoin within 30s
- Host-backend partition: Host loses authority, must recover on reconnection
- Player-backend partition: Player automatically reconnects, receives state sync
- Backend-network partition: Entire room becomes unavailable

**Availability Optimizations**:
- Host recovery from player checkpoints (typically <5s downtime)
- Player reconnection window (30s grace period)
- Automatic retry logic (continuous reconnection attempts)

### Design Decisions & Rationale

#### Why client-side state management?

**Alternative**: Backend could manage state and validate all transitions

**Chosen approach**: Host (client) manages state, backend relays messages

**Rationale**:
- Lower latency (no server validation roundtrip)
- Simpler backend (can be truly stateless)
- Easier to reason about (state machine in one place)
- Acceptable trust model for casual game (no money at stake)

#### Why XState for state management?
**Alternative**: Manual state management with React hooks
**Chosen approach**: Deterministic finite state machine (XState)
**Rationale**:
- Guarantees valid state transitions (guards prevent invalid moves)
- Serializable state (trivial to checkpoint)
- Testable logic (state machine can be tested in isolation)
- Visual debugger (XState inspector)
- Self-documenting (state chart shows all possible states/transitions)

### Connection to Distributed Systems Principles

This project demonstrates several fundamental concepts from distributed systems and large-scale system design:

**Consensus & Coordination**:
- Single-master replication pattern (host as master, players as replicas)
- Deterministic state machines for consistent state transitions
- No distributed consensus algorithm needed (master authority model)

**Fault Tolerance**:
- Graceful degradation on network partitions
- Checkpoint/restore pattern for crash recovery
- Idempotent operations (reconnection can be retried safely)

**Data Distribution**:
- State sharding (each player receives only their view)
- Replication for disaster recovery (encrypted state on all clients)
- Lazy propagation (eventual consistency for non-critical updates)

**System Design Patterns**:
- Pub/Sub messaging (host publishes, players subscribe)
- Event-driven architecture (state machine reacts to events)
- Stateless service layer (backend can be easily replicated)
- Circuit breaker pattern (reconnection backoff prevents thundering herd)

**Performance & Scalability**:
- Horizontal scaling via room isolation (shard by room code)
- Client-side computation reduces server load
- WebSocket connection pooling potential
- Minimal serialization overhead (direct JSON over WebSocket)

### Future Enhancements

**Potential distributed systems improvements**:
1. **Redis-backed state**: Replace in-memory storage with Redis for multi-backend scaling
2. **Leader election**: Implement Raft/Paxos for automatic host failover to a player
3. **Load balancing**: Add HAProxy/Nginx for distributing rooms across backend instances
4. **Metrics & Observability**: Add Prometheus metrics for connection latency, state size, recovery times
5. **State compression**: Implement LZ4/Snappy compression for state snapshots
6. **Differential updates**: Send only state deltas instead of full snapshots (reduce bandwidth)
7. **Conflict-free replicated data types (CRDTs)**: Allow peer-to-peer state synchronization without host
8. **WebRTC peer-to-peer**: Direct player-to-player communication for low-latency updates
