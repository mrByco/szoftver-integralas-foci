import { GameEngine } from '../src/game/gameEngine';
import { GAME_CONSTANTS } from '../src/game/models';
import { MESSAGE_TYPES, SOCKET_EVENTS } from '../src/protocol/messages';
import { BroadcastLike, ClientSocketLike, GameProtocolServerSkeleton } from '../src/protocol/serverSkeleton';

class MockSocket implements ClientSocketLike {
    public handlers = new Map<string, (payload: any) => void>();
    public emitted: Array<{ event: string; payload: any }> = [];

    constructor(public id: string) { }

    emit(event: string, payload: unknown): void {
        this.emitted.push({ event, payload });
    }

    on(event: string, handler: (payload: any) => void): void {
        this.handlers.set(event, handler);
    }

    trigger(event: string, payload: any): void {
        const handler = this.handlers.get(event);
        if (handler) {
            handler(payload);
        }
    }
}

class MockBroadcast implements BroadcastLike {
    public emitted: Array<{ event: string; payload: any }> = [];

    emit(event: string, payload: unknown): void {
        this.emitted.push({ event, payload });
    }
}

describe('GameProtocolServerSkeleton', () => {
    it('sends connect and game state on connection, not game start broadcast', () => {
        const engine = new GameEngine();
        const broadcast = new MockBroadcast();
        const protocol = new GameProtocolServerSkeleton(engine, broadcast);
        const socket = new MockSocket('s1');

        protocol.handleConnection(socket);

        expect(socket.emitted.some(
            (entry) => entry.event === SOCKET_EVENTS.message && entry.payload.type === MESSAGE_TYPES.playerConnected
        )).toBe(true);
        // initial state snapshot broadcast to all clients as game:update
        expect(broadcast.emitted.some(
            (entry) => entry.event === SOCKET_EVENTS.message && entry.payload.type === MESSAGE_TYPES.gameUpdate
        )).toBe(true);
        expect(socket.emitted.some(
            (entry) => entry.event === SOCKET_EVENTS.message && entry.payload.type === MESSAGE_TYPES.gameStart
        )).toBe(false);
    });

    it('starts the game when two clients are connected and one sends start-request', () => {
        const engine = new GameEngine();
        const broadcast = new MockBroadcast();
        const protocol = new GameProtocolServerSkeleton(engine, broadcast);
        const s1 = new MockSocket('s1');
        const s2 = new MockSocket('s2');

        protocol.handleConnection(s1);
        protocol.handleConnection(s2);

        broadcast.emitted.length = 0;
        s1.trigger(MESSAGE_TYPES.gameStartRequest, undefined);

        expect(broadcast.emitted.some(
            (entry) => entry.event === SOCKET_EVENTS.message && entry.payload.type === MESSAGE_TYPES.gameStart
        )).toBe(true);
    });

    it('does not start the game when only one client is connected', () => {
        const engine = new GameEngine();
        const broadcast = new MockBroadcast();
        const protocol = new GameProtocolServerSkeleton(engine, broadcast);
        const socket = new MockSocket('s1');

        protocol.handleConnection(socket);
        broadcast.emitted.length = 0;
        socket.trigger(MESSAGE_TYPES.gameStartRequest, undefined);

        expect(broadcast.emitted.some(
            (entry) => entry.event === SOCKET_EVENTS.message && entry.payload.type === MESSAGE_TYPES.gameStart
        )).toBe(false);
    });

    it('applies controls for players of the connected team', () => {
        const engine = new GameEngine();
        const broadcast = new MockBroadcast();
        const protocol = new GameProtocolServerSkeleton(engine, broadcast);
        const s1 = new MockSocket('s1');
        const s2 = new MockSocket('s2');

        protocol.handleConnection(s1);
        protocol.handleConnection(s2);
        s1.trigger(MESSAGE_TYPES.gameStartRequest, undefined);

        const players = engine.getState().players.filter((p) => p.team === 'red');
        expect(players).toHaveLength(5);

        s1.trigger(SOCKET_EVENTS.message, {
            type: MESSAGE_TYPES.playerControls,
            payload: { controls: [{ id: players[0].id, velocity: { x: 1, y: 0 } }, { id: players[1].id, velocity: { x: 0, y: 1 } }] }
        });

        const state = engine.getState();
        const p0 = state.players.find((p) => p.id === players[0].id)!;
        const p1 = state.players.find((p) => p.id === players[1].id)!;
        expect(p0.velocity.x).toBeCloseTo(GAME_CONSTANTS.playerMaxSpeed, 5);
        expect(p0.velocity.y).toBeCloseTo(0, 5);
        expect(p1.velocity.x).toBeCloseTo(0, 5);
        expect(p1.velocity.y).toBeCloseTo(GAME_CONSTANTS.playerMaxSpeed, 5);
    });

    it('broadcasts update on tick after game started', () => {
        const engine = new GameEngine();
        const broadcast = new MockBroadcast();
        const protocol = new GameProtocolServerSkeleton(engine, broadcast);
        const s1 = new MockSocket('s1');
        const s2 = new MockSocket('s2');

        protocol.handleConnection(s1);
        protocol.handleConnection(s2);
        s1.trigger(MESSAGE_TYPES.gameStartRequest, undefined);
        broadcast.emitted.length = 0;

        protocol.tick(0.05);

        expect(broadcast.emitted.some(
            (entry) => entry.event === SOCKET_EVENTS.message && entry.payload.type === MESSAGE_TYPES.gameUpdate
        )).toBe(true);
        expect(broadcast.emitted.some(
            (entry) => entry.event === MESSAGE_TYPES.gameUpdate
        )).toBe(true);

        const updateEnvelope = broadcast.emitted.find(
            (entry) => entry.event === SOCKET_EVENTS.message && entry.payload.type === MESSAGE_TYPES.gameUpdate
        );
        expect(updateEnvelope?.payload.payload.players[0].team).toBe('red');
    });

    it('does not broadcast update on tick before game started', () => {
        const engine = new GameEngine();
        const broadcast = new MockBroadcast();
        const protocol = new GameProtocolServerSkeleton(engine, broadcast);
        const socket = new MockSocket('s1');

        protocol.handleConnection(socket);
        broadcast.emitted.length = 0;
        protocol.tick(0.05);

        expect(broadcast.emitted.some(
            (entry) => entry.event === MESSAGE_TYPES.gameUpdate
        )).toBe(false);
    });

    it('accepts direct controls event for compatibility', () => {
        const engine = new GameEngine();
        const broadcast = new MockBroadcast();
        const protocol = new GameProtocolServerSkeleton(engine, broadcast);
        const s1 = new MockSocket('s1');
        const s2 = new MockSocket('s2');

        protocol.handleConnection(s1);
        protocol.handleConnection(s2);
        s1.trigger(MESSAGE_TYPES.gameStartRequest, undefined);

        const players = engine.getState().players.filter((p) => p.team === 'red');

        s1.trigger(MESSAGE_TYPES.playerControls, {
            controls: [{ id: players[2].id, velocity: { x: 0, y: 1 } }]
        });

        const state = engine.getState();
        const p2 = state.players.find((p) => p.id === players[2].id)!;
        expect(p2.velocity.x).toBeCloseTo(0, 5);
        expect(p2.velocity.y).toBeCloseTo(GAME_CONSTANTS.playerMaxSpeed, 5);
    });

    it('removes all team players on disconnect', () => {
        const engine = new GameEngine();
        const broadcast = new MockBroadcast();
        const protocol = new GameProtocolServerSkeleton(engine, broadcast);
        const socket = new MockSocket('s1');

        protocol.handleConnection(socket);
        expect(engine.getState().players).toHaveLength(5);

        socket.trigger('disconnect', undefined);
        expect(engine.getState().players).toHaveLength(0);
    });
});
