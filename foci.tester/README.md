# foci-angular-client

Small Angular client for the `foci.ts` Socket.IO soccer server.

## Requirements

- Node.js 20+
- Running `foci.ts` server (default: `http://localhost:3000`)

## Install

```bash
npm install
```

## Run

```bash
npm start
```

Open `http://localhost:4200`, set server URL if needed, then click **Connect**.

## Controls

- `W` = move up
- `A` = move left
- `S` = move down
- `D` = move right
- `Stop` = zero velocity

The field view renders players and ball from `game:start` / `game:update` messages.
