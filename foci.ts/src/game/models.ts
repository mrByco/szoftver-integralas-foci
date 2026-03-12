export type Team = 'red' | 'blue';

export interface Vector2 {
    x: number;
    y: number;
}

export interface Player {
    id: string;
    team: Team;
    position: Vector2;
    velocity: Vector2;
}

export interface Ball {
    position: Vector2;
    velocity: Vector2;
}

export interface ScoreBoard {
    red: number;
    blue: number;
}

export interface GameState {
    players: Player[];
    ball: Ball;
    score: ScoreBoard;
    goalScoredThisTick: boolean;
}

export interface PlayerControl {
    id: string;
    velocity: Vector2;
}

export const GAME_CONSTANTS = {
    mapWidth: 20,
    mapHeight: 15,
    goalBoxHeight: 4,
    playerRadius: 0.5,
    ballRadius: 0.35,
    playerMaxSpeed: 6,
    ballFrictionPerTick: 0.98,
    kickStrength: 8
} as const;
