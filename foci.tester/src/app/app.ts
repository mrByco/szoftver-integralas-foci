import { CommonModule } from '@angular/common';
import { Component, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { io, Socket } from 'socket.io-client';

type Team = 'red' | 'blue';

interface Vector2 {
  x: number;
  y: number;
}

interface PlayerDto {
  id: string;
  pos: Vector2;
  team: Team;
  velocity: Vector2;
}

interface BallDto {
  pos: Vector2;
  velocity: Vector2;
}

interface Envelope<TType extends string, TPayload> {
  type: TType;
  payload: TPayload;
}

interface ConnectPayload {
  color: Team;
}

interface UpdatePayload {
  players: PlayerDto[];
  ball: BallDto;
}

interface GamePointPayload {
  team: Team;
  red: number;
  blue: number;
}

interface ControlsPayload {
  controls: Array<{
    velocity: Vector2;
  }>;
}

const SOCKET_EVENTS = {
  message: 'message',
} as const;

const MESSAGE_TYPES = {
  playerConnected: 'player:connected',
  gameStart: 'game:start',
  gameUpdate: 'game:update',
  gamePoint: 'game:point',
  playerControls: 'player:controls',
} as const;

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnDestroy {
  serverUrl = 'http://localhost:3000';
  status = 'Disconnected';
  team: Team | 'unknown' = 'unknown';
  redScore = 0;
  blueScore = 0;
  players: PlayerDto[] = [];
  ball = signal<BallDto>({ pos: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } });

  private socket: Socket | null = null;

  connect(): void {
    this.disconnect();
    this.status = 'Connecting...';

    this.socket = io(this.serverUrl, {
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      this.status = `Connected (${this.socket?.id ?? 'socket'})`;
    });

    this.socket.on('disconnect', () => {
      this.status = 'Disconnected';
      this.team = 'unknown';
    });

    this.socket.on(SOCKET_EVENTS.message, (envelope: Envelope<string, unknown>) => {
      this.handleServerMessage(envelope);
    });
  }

  disconnect(): void {
    if (!this.socket) {
      return;
    }

    this.socket.disconnect();
    this.socket = null;
    this.status = 'Disconnected';
    this.team = 'unknown';
  }

  move(direction: 'up' | 'down' | 'left' | 'right' | 'stop'): void {
    const speed = 1;
    let velocity: Vector2 = { x: 0, y: 0 };

    if (direction === 'up') velocity = { x: 0, y: -speed };
    if (direction === 'down') velocity = { x: 0, y: speed };
    if (direction === 'left') velocity = { x: -speed, y: 0 };
    if (direction === 'right') velocity = { x: speed, y: 0 };

    this.sendControls({ controls: [{ velocity }] });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  getFieldX(x: number): number {
    const mapWidth = 20;
    return ((x + mapWidth / 2) / mapWidth) * 100;
  }

  getFieldY(y: number): number {
    const mapHeight = 15;
    return ((y + mapHeight / 2) / mapHeight) * 100;
  }

  private sendControls(payload: ControlsPayload): void {
    this.socket?.emit(SOCKET_EVENTS.message, {
      type: MESSAGE_TYPES.playerControls,
      payload,
    });
  }

  private handleServerMessage(envelope: Envelope<string, unknown>): void {
    if (!envelope || typeof envelope !== 'object') {
      return;
    }

    if (envelope.type === MESSAGE_TYPES.playerConnected) {
      console.log("playe connected")
      const payload = envelope.payload as ConnectPayload;
      this.team = payload.color;
      return;
    }

    if (envelope.type === MESSAGE_TYPES.gameStart || envelope.type === MESSAGE_TYPES.gameUpdate) {
      const payload = envelope.payload as UpdatePayload;
      this.players = payload.players;
      this.ball.set(payload.ball);
      console.log(this.ball().pos)
      return;
    }

    if (envelope.type === MESSAGE_TYPES.gamePoint) {
      const payload = envelope.payload as GamePointPayload;
      this.redScore = payload.red;
      this.blueScore = payload.blue;
    }
  }
}
