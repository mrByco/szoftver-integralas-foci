import { CommonModule } from '@angular/common';
import { Component, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { io, Socket } from 'socket.io-client';
import { GameAI } from './game-ai';
import { GameStateQuery, IGameAI } from './game-ai.interface';
import { PressingGameAI } from './game-ai-pressing';
import { BallDto, ControlsPayload, PlayerDto, Team } from './game-models';

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

const SOCKET_EVENTS = {
  message: 'message',
} as const;

const MESSAGE_TYPES = {
  playerConnected: 'player:connected',
  gameStart: 'game:start',
  gameUpdate: 'game:update',
  gamePoint: 'game:point',
  playerControls: 'player:controls',
  gameStartRequest: 'game:start-request',
} as const;

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnDestroy {
  serverUrl = 'http://localhost:3001';
  selectedAIId = 'balanced';
  status = 'Disconnected';
  team: Team | 'unknown' = 'unknown';
  redScore = 0;
  blueScore = 0;
  players: PlayerDto[] = [];
  ball = signal<BallDto>({ pos: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } });
  aiOptions: Array<{ id: string; label: string }> = [];

  private socket: Socket | null = null;
  private gameStarted = false;
  private readonly gameAIs = new Map<string, IGameAI>();

  constructor() {
    const balanced = new GameAI();
    const pressing = new PressingGameAI();
    this.gameAIs.set(balanced.id, balanced);
    this.gameAIs.set(pressing.id, pressing);
    this.aiOptions = [
      { id: balanced.id, label: balanced.label },
      { id: pressing.id, label: pressing.label },
    ];
    this.selectedAIId = balanced.id;
  }

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
      this.gameStarted = false;
    });

    this.socket.on(SOCKET_EVENTS.message, (envelope: Envelope<string, unknown>) => {
      this.handleServerMessage(envelope);
    });
  }

  disconnect(): void {
    if (!this.socket) {
      return;
    }

    this.gameStarted = false;
    this.socket.disconnect();
    this.socket = null;
    this.status = 'Disconnected';
    this.team = 'unknown';
  }

  requestStart(): void {
    this.socket?.emit(SOCKET_EVENTS.message, {
      type: MESSAGE_TYPES.gameStartRequest,
      payload: {},
    });
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

  private computeAIControls(): void {
    if (!this.socket || this.team === 'unknown') return;

    const team = this.team;
    const strategy = this.gameAIs.get(this.selectedAIId);
    if (!strategy) return;

    const query: GameStateQuery = {
      getTeam: () => team,
      getPlayers: () => this.players,
      getBall: () => this.ball(),
    };

    const payload = strategy.computeControls(query);
    if (payload.controls.length > 0) {
      this.sendControls(payload);
    }
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

    if (envelope.type === MESSAGE_TYPES.gameStart) {
      const payload = envelope.payload as UpdatePayload;
      this.players = payload.players;
      this.ball.set(payload.ball);
      this.gameStarted = true;
      this.computeAIControls();
      return;
    }

    if (envelope.type === MESSAGE_TYPES.gameUpdate) {
      const payload = envelope.payload as UpdatePayload;
      this.players = payload.players;
      this.ball.set(payload.ball);
      if (this.gameStarted) this.computeAIControls();
      return;
    }

    if (envelope.type === MESSAGE_TYPES.gamePoint) {
      const payload = envelope.payload as GamePointPayload;
      this.redScore = payload.red;
      this.blueScore = payload.blue;
    }
  }
}
