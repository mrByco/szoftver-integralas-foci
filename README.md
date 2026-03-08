# szoftver-integralas-foci

Endpoints

on connect 
server -> client
{
   color: "red"/"blue"
}

server -> client
update
{
    players: player[],
    ball: ball
}

player: {
  id: int
  pos: {
    x: float,
    y: float,
  },
  velocity: {
    x: float,
    y: float,
  }
}

ball: {
  pos: {
    x: float,
    y: float,
  },
  velocity: {
    x: float,
    y: float,
  }
}


server -> client
Kezdés
{
    players: player[],
    ball: ball
}


server -> client
Pont szerzés
{
  team: blue/red
  red: int,
  blue: int,
}


client -> server
{
  controls: playerControl[]
}
playerControl: {
  id: int
  velocity: {
    x: float,
    y: float,
  }
}
