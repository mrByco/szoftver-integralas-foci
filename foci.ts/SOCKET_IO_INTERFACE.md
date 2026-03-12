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

## Server -> Client Events

### 1) `player:connected`

Sent to the newly connected client.

Payload:

```json
{
  "color": "red"
}
```

`color` is either `"red"` or `"blue"`.

### 2) `game:start`

Sent to the newly connected client after `player:connected`.

Payload:

```json
{
  "players": [
    {
      "id": "p1",
      "team": "red",
      "pos": { "x": -5, "y": 0 },
      "velocity": { "x": 0, "y": 0 }
    }
  ],
  "ball": {
    "pos": { "x": 0, "y": 0 },
    "velocity": { "x": 0, "y": 0 }
  }
}
```

### 3) `game:update`

Broadcast periodically to all clients (tick loop).

Payload:

```json
{
  "players": [
    {
      "id": "p1",
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

### `player:controls`

Client sends desired movement input.

Payload:

```json
{
  "controls": [
    {
      "id": "p1",
      "velocity": { "x": 4, "y": 0 }
    }
  ]
}
```

Notes:

- `id` is optional in payload, but recommended.
- Server applies controls only to the player bound to that socket.
- If multiple controls are sent, server prefers matching player id, otherwise first item.

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

Controls are accepted in both forms:

- Envelope form on `message`
- Direct form on `player:controls`

---

## Recommended Client Usage

Use **one** style consistently in the client code.

### Option A: Direct typed events (simpler)

- Listen to: `player:connected`, `game:start`, `game:update`, `game:point`
- Emit: `player:controls`

### Option B: Envelope style

- Listen to: `message`
- Switch by `message.type`
- Emit controls as envelope with `type: "player:controls"`

---

## Tick Rate

- Default server tick interval: `50ms` (~20 TPS)
- `game:update` is emitted every tick.

---

## Disconnect Behavior

On socket disconnect:

- the corresponding player is removed from game state
- subsequent updates reflect the updated player list
