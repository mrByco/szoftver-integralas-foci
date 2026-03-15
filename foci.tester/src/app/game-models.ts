export type Team = 'red' | 'blue';

export interface Vector2 {
  x: number;
  y: number;
}

export interface PlayerDto {
  id: number;
  pos: Vector2;
  team: Team;
  velocity: Vector2;
}

export interface BallDto {
  pos: Vector2;
  velocity: Vector2;
}

export interface ControlsPayload {
  controls: Array<{
    id: number;
    velocity: Vector2;
  }>;
}
