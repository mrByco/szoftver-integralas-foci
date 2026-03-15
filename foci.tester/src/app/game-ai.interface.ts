import { BallDto, ControlsPayload, PlayerDto, Team } from './game-models';

export interface GameStateQuery {
  getTeam(): Team;
  getPlayers(): PlayerDto[];
  getBall(): BallDto;
}

export interface IGameAI {
  readonly id: string;
  readonly label: string;
  computeControls(query: GameStateQuery): ControlsPayload;
}
