# Socket.IO Interface Docs

## Endpoint

- URL: `http://localhost:3001` (default)
- Path: `/socket.io` (Socket.IO default)
- Transport: Socket.IO (WebSocket with fallback)

> Port can be overridden with `PORT` environment variable.

## Event Model

The server supports **two compatible message styles**:

1. **Envelope style** on the `message` event
2. **Direct typed events** (`game:update`, `player:controls`, etc.)

---

## Envelope Format

Used on event: `message`

```json
{
  "type": "string",
  "payload": {}
}
```

---

## Connection & Lobby Flow

1. Client connects -> server assigns a team (`red` or `blue`) and spawns **5 players** for that team.
2. Server sends `player:connected` to the new client.
3. Server broadcasts `game:update` to **all** connected clients (so every client can render each other).
4. When **both** clients are connected, either client may send `game:start-request`.
5. Server validates two clients are present, sets the game as started, and broadcasts `game:start` to all.
6. Clients begin sending `player:controls`; the tick loop starts producing `game:update` broadcasts.

---

## Server -> Client Events

### 1) `player:connected`

Sent only to the newly connected client.

Payload:

```json
{
  "color": "red"
}
```

`color` is either `"red"` or `"blue"`.

### 2) `game:update`

Broadcast to **all clients** whenever state changes:

- immediately when any client connects (lobby state)
- every server tick once the game is started

Payload:

```json
{
  "players": [
    {
      "id": 0,
      "team": "red",
      "pos": { "x": -4.7, "y": 0.2 },
      "velocity": { "x": 3, "y": 1 }
    }
  ],
  "ball": {
    "pos": { "x": 0.4, "y": -0.1 },
    "velocity": { "x": 1.2, "y": 0.0 }
  }
}
```

> Player `id` is a **number**. Red team IDs start from `0`, blue team IDs start from `100`.

### 3) `game:start`

Broadcast to **all clients** when the game is started (after a valid `game:start-request`).

Payload:

```json
{
  "players": [
    {
      "id": 0,
      "team": "red",
      "pos": { "x": -5, "y": 0 },
      "velocity": { "x": 0, "y": 0 }
    }
  ],
  "ball": {
    "pos": { "x": 0, "y": 0 },
    "velocity": { "x": 3.2, "y": -1.5 }
  }
}
```

> The ball is launched in a **random direction** at `kickStrength` speed.

### 4) `game:point`

Broadcast when a goal is scored.

Payload:

```json
{
  "team": "red",
  "red": 2,
  "blue": 1
}
```

---

## Client -> Server Events

### `game:start-request`

Sent by a client to request starting the game.

No payload required.

Rules:

- Ignored if fewer than 2 clients are connected.
- Ignored if the game has already started.
- Either client may send it.

### `player:controls`

Client sends desired movement input for its team's players.

Payload:

```json
{
  "controls": [
    {
      "id": 0,
      "velocity": { "x": 0.6, "y": 0.8 }
    },
    {
      "id": 1,
      "velocity": { "x": -1.0, "y": 0.0 }
    }
  ]
}
```

Notes:

- Each client controls **5 players** (its full team).
- `id` must match a player ID belonging to the sender's team; unrecognised IDs are ignored.
- `velocity` is treated as a **direction vector** — it is normalized and then scaled to `playerMaxSpeed`. Magnitude does not matter; only direction is used.
- Controls are ignored before `game:start` is received.

---

## How Compatibility Works

### Outbound (server -> client)

Each outbound message is emitted in both forms:

- Envelope form:
  - event: `message`
  - payload: `{ type: "game:update", payload: { ... } }`
- Direct form:
  - event: `game:update`
  - payload: `{ ... }`

### Inbound (client -> server)

Messages are accepted in both forms:

- Envelope form on `message`
- Direct form on the event name (e.g. `player:controls`, `game:start-request`)

---

## Recommended Client Usage

Use **one** style consistently in the client code.

### Option A: Direct typed events (simpler)

- Listen to: `player:connected`, `game:start`, `game:update`, `game:point`
- Emit: `game:start-request`, `player:controls`

### Option B: Envelope style

- Listen to: `message`
- Switch by `message.type`
- Emit as envelope with appropriate `type`

---

## Tick Rate

- Default server tick interval: `50ms` (~20 TPS)
- `game:update` is emitted every tick once the game has started.

---

## Disconnect Behavior

On socket disconnect:

- All **5 players** of that team are removed from game state.
- The game is reset to "not started" state.
- Remaining client receives a `game:update` broadcast reflecting the updated player list.

---

## Changelog

### 2026-03-15

- **Player `id` changed from `string` to `number`.** Red team IDs start at `0`, blue team IDs start at `100`.
- **Two-client model.** Each client controls a full team of 5 players (spawned on connect). Server only accepts 2 clients.
- **`game:start-request` inbound message added.** Game only starts when both clients are connected and one sends this message. Controls and tick broadcasts are blocked until then.
- **`game:start` is now a broadcast**, sent to all clients when the game is actually started — not sent individually on connect.
- **`game:update` sent on connect** (broadcast to all) so clients can render each other in the lobby. The per-socket initial-state emit on connect was replaced with this broadcast.
- **Ball launches in a random direction** at game start and after each goal.
- **`player:controls` velocity is now treated as a direction vector.** Server normalizes the input and scales it to `playerMaxSpeed`; raw magnitude is ignored.
