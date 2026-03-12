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
    private readonly socketToPlayerId = new Map<string, string>();
    private nextTeam: Team = 'red';

    constructor(
        private readonly engine: GameEngine,
        private readonly broadcaster: BroadcastLike
    ) { }

    handleConnection(socket: ClientSocketLike): void {
        const team = this.consumeNextTeam();
        const player = this.engine.addPlayer(team);
        this.socketToPlayerId.set(socket.id, player.id);

        socket.on(SOCKET_EVENTS.message, (envelope: InboundEnvelope) => {
            this.handleInboundEnvelope(socket.id, envelope);
        });

        socket.on(MESSAGE_TYPES.playerControls, (payload: ControlsPayload) => {
            this.handleControls(socket.id, payload);
        });

        socket.on('disconnect', () => {
            this.handleDisconnect(socket.id);
        });

        this.emitToSocket(socket, {
            type: MESSAGE_TYPES.playerConnected,
            payload: { color: team }
        });

        this.emitToSocket(socket, {
            type: MESSAGE_TYPES.gameStart,
            payload: toStateDto(this.engine.getState())
        });
    }

    handleInboundEnvelope(socketId: string, envelope: InboundEnvelope): void {
        if (!envelope || envelope.type !== MESSAGE_TYPES.playerControls) {
            return;
        }

        this.handleControls(socketId, envelope.payload);
    }

    handleControls(socketId: string, payload: ControlsPayload): void {
        const playerId = this.socketToPlayerId.get(socketId);
        if (!playerId || !payload || !Array.isArray(payload.controls) || payload.controls.length === 0) {
            return;
        }

        const ownControl = payload.controls.find((control) => control.id === playerId);
        const selected = ownControl ?? payload.controls[0];
        if (!selected || !selected.velocity || !Number.isFinite(selected.velocity.x) || !Number.isFinite(selected.velocity.y)) {
            return;
        }

        this.engine.applyControls([
            {
                id: playerId,
                velocity: {
                    x: selected.velocity.x,
                    y: selected.velocity.y
                }
            }
        ]);
    }

    handleDisconnect(socketId: string): void {
        const playerId = this.socketToPlayerId.get(socketId);
        if (!playerId) {
            return;
        }

        this.socketToPlayerId.delete(socketId);
        this.engine.removePlayer(playerId);
    }

    tick(deltaTime: number): void {
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
        const team = this.nextTeam;
        this.nextTeam = this.nextTeam === 'red' ? 'blue' : 'red';
        return team;
    }
}
