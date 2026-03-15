import { Team, Vector2 } from '../game/models';

export interface Envelope<TType extends string = string, TPayload = unknown> {
    type: TType;
    payload: TPayload;
}

export interface PlayerDto {
    id: number;
    team: Team;
    pos: Vector2;
    velocity: Vector2;
}

export interface BallDto {
    pos: Vector2;
    velocity: Vector2;
}

export interface ConnectPayload {
    color: Team;
}

export interface UpdatePayload {
    players: PlayerDto[];
    ball: BallDto;
}

export interface GameStartPayload {
    players: PlayerDto[];
    ball: BallDto;
}

export interface EarnPointPayload {
    team: Team;
    red: number;
    blue: number;
}

export interface ControlsPayload {
    controls: Array<{
        id?: number;
        velocity: Vector2;
    }>;
}

export const SOCKET_EVENTS = {
    message: 'message'
} as const;

export const MESSAGE_TYPES = {
    playerConnected: 'player:connected',
    gameStartRequest: 'game:start-request',
    gameStart: 'game:start',
    gameUpdate: 'game:update',
    gamePoint: 'game:point',
    playerControls: 'player:controls'
} as const;

export type OutboundEnvelope =
    | Envelope<typeof MESSAGE_TYPES.playerConnected, ConnectPayload>
    | Envelope<typeof MESSAGE_TYPES.gameStart, GameStartPayload>
    | Envelope<typeof MESSAGE_TYPES.gameUpdate, UpdatePayload>
    | Envelope<typeof MESSAGE_TYPES.gamePoint, EarnPointPayload>;

export type InboundEnvelope =
    | Envelope<typeof MESSAGE_TYPES.playerControls, ControlsPayload>
    | Envelope<typeof MESSAGE_TYPES.gameStartRequest>;
