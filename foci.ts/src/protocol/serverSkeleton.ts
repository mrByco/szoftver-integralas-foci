import { GameEngine } from '../game/gameEngine';
import { Team } from '../game/models';
import { toStateDto } from './mapper';
import { ControlsPayload, InboundEnvelope, MESSAGE_TYPES, OutboundEnvelope, SOCKET_EVENTS } from './messages';

export interface ClientSocketLike {
    id: string;
    emit(event: string, payload: unknown): void;
    on(event: string, handler: (payload: any) => void): void;
}

export interface BroadcastLike {
    emit(event: string, payload: unknown): void;
}

export class GameProtocolServerSkeleton {
    private readonly socketToTeam = new Map<string, Team>();
    //private nextTeam: Team = 'red';
    private gameStarted = false;

    constructor(
        private readonly engine: GameEngine,
        private readonly broadcaster: BroadcastLike
    ) { }

    handleConnection(socket: ClientSocketLike): void {
        const team = this.consumeNextTeam();
        this.engine.addTeam(team);
        this.socketToTeam.set(socket.id, team);

        socket.on(SOCKET_EVENTS.message, (envelope: InboundEnvelope) => {
            this.handleInboundEnvelope(socket.id, envelope);
        });

        socket.on(MESSAGE_TYPES.playerControls, (payload: ControlsPayload) => {
            this.handleControls(socket.id, payload);
        });

        socket.on(MESSAGE_TYPES.gameStartRequest, () => {
            this.handleStartRequest(socket.id);
        });

        socket.on('disconnect', () => {
            this.handleDisconnect(socket.id);
        });

        this.emitToSocket(socket, {
            type: MESSAGE_TYPES.playerConnected,
            payload: { color: team }
        });

        this.emitGameUpdate();

    }

    emitGameUpdate() {
        this.emitToAll({
            type: MESSAGE_TYPES.gameUpdate,
            payload: toStateDto(this.engine.getState())
        });
    }

    handleInboundEnvelope(socketId: string, envelope: InboundEnvelope): void {
        if (!envelope) {
            return;
        }

        if (envelope.type === MESSAGE_TYPES.gameStartRequest) {
            this.handleStartRequest(socketId);
            return;
        }

        if (envelope.type === MESSAGE_TYPES.playerControls) {
            this.handleControls(socketId, envelope.payload);
        }
    }

    handleStartRequest(socketId: string): void {
        if (this.gameStarted || !this.socketToTeam.has(socketId) || this.socketToTeam.size < 2) {
            return;
        }

        this.gameStarted = true;
        this.emitToAll({
            type: MESSAGE_TYPES.gameStart,
            payload: toStateDto(this.engine.getState())
        });
    }

    handleControls(socketId: string, payload: ControlsPayload): void {
        if (!this.gameStarted) {
            return;
        }

        const team = this.socketToTeam.get(socketId);
        if (!team || !payload || !Array.isArray(payload.controls) || payload.controls.length === 0) {
            return;
        }

        const teamPlayers = this.engine.getState().players.filter((p) => p.team === team);
        const validControls = teamPlayers.flatMap((player) => {
            const control = payload.controls.find((c) => c.id === player.id);
            if (!control || !control.velocity || !Number.isFinite(control.velocity.x) || !Number.isFinite(control.velocity.y)) {
                return [];
            }
            return [{ id: player.id, velocity: { x: control.velocity.x, y: control.velocity.y } }];
        });

        if (validControls.length > 0) {
            this.engine.applyControls(validControls);
        }
    }

    handleDisconnect(socketId: string): void {
        const team = this.socketToTeam.get(socketId);
        if (!team) {
            return;
        }

        this.socketToTeam.delete(socketId);
        this.gameStarted = false;
        this.engine.removeTeam(team);
        console.log(`Team ${team} has been removed due to disconnect`);
        this.emitGameUpdate();
    }

    tick(deltaTime: number): void {
        if (!this.gameStarted) {
            return;
        }

        const previousState = this.engine.getState();
        this.engine.tick(deltaTime);
        const state = this.engine.getState();

        if (state.goalScoredThisTick) {
            const scoringTeam: Team = state.score.red > previousState.score.red ? 'red' : 'blue';
            this.emitToAll({
                type: MESSAGE_TYPES.gamePoint,
                payload: {
                    team: scoringTeam,
                    red: state.score.red,
                    blue: state.score.blue
                }
            });
        }

        this.emitToAll({
            type: MESSAGE_TYPES.gameUpdate,
            payload: toStateDto(state)
        });
    }

    private emitToSocket(socket: ClientSocketLike, envelope: OutboundEnvelope): void {
        socket.emit(SOCKET_EVENTS.message, envelope);
        socket.emit(envelope.type, envelope.payload);
    }

    private emitToAll(envelope: OutboundEnvelope): void {
        this.broadcaster.emit(SOCKET_EVENTS.message, envelope);
        this.broadcaster.emit(envelope.type, envelope.payload);
    }

    private consumeNextTeam(): Team {
        let teams = new Set(this.socketToTeam.values());

        console.log('Current teams:', teams);

        if (!teams.has('red')) {
            return 'red';
        }
        if (!teams.has('blue')) {
            return 'blue';
        }

        throw new Error('No more teams available');
    }
}
