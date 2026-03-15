extends Node

@export var socketIOHandler: SocketIOHandler

@export var playerNr: int;
@export var redHandler: TeamHandler;
@export var blueHandler: TeamHandler;
@export var item: ItemHandler;

@export var ballDiamater: float;
@export var playerDiamater: float;

var ballItem: ItemHandler;

var myColor: String = ""

func _ready() -> void:
	socketIOHandler.connect_signal.connect(receive_color)
	socketIOHandler.start_signal.connect(receive_start)
	socketIOHandler.update_signal.connect(receive_update)
	socketIOHandler.point_signal.connect(receive_update)
	
	ballItem = item.duplicate() as ItemHandler;
	ballItem.name = "Ball"
	ballItem.visible = true
	add_child(ballItem)
	ballItem.set_diameter(ballDiamater)
	
	var radius: float = 6
	
	for i in range(playerNr):
		var newRedPlayer = item.duplicate() as ItemHandler	
		newRedPlayer.name = str(i)
		var angleRed: float = deg_to_rad(90 + 18 + 36 * i)
	
		newRedPlayer.visible = true
		redHandler.add_child(newRedPlayer)
		newRedPlayer.texture = redHandler.texture
		newRedPlayer.set_pos_and_speed(Vector2(radius * cos(angleRed), radius * sin(angleRed)))
		newRedPlayer.set_diameter(playerDiamater)
		
		var newBluePlayer = item.duplicate() as ItemHandler
		newBluePlayer.name = str(i)
		var angleBlue: float = deg_to_rad(90 - 18 - 36 * i) 
		
		newBluePlayer.visible = true
		blueHandler.add_child(newBluePlayer)
		newBluePlayer.texture = blueHandler.texture		
		newBluePlayer.set_pos_and_speed(Vector2(radius * cos(angleBlue), radius * sin(angleBlue)))
		newBluePlayer.set_diameter(playerDiamater)
	
func receive_color(color: Dictionary):
	myColor = color["color"]

func receive_start(start_state: Dictionary):
	pass
	
func receive_update(update_state: Dictionary):
	pass
		
func receive_point(point_state: Dictionary):
	pass
	
func process_state_message(state: JSON):
	var players = state["players"]
	
	for player in players:
		var position: Vector2 = Vector2(player["pos"]["x"],player["pos"]["y"])
		var speed: Vector2 = Vector2(player["velocity"]["x"],player["velocity"]["y"])
		
		var id: int = player["id"]
		id = id % 10
		
		if player["team"] == "red":
			redHandler.set_player_data(id, position, speed)
		if player["team"] == "blue":
			blueHandler.set_player_data(id, position, speed)
		
	var ball = state["ball"]	
	var ballPos: Vector2 = Vector2(ball["pos"]["x"], ball["pos"]["y"])
	var ballVel: Vector2 = Vector2(ball["velocity"]["x"], ball["velocity"]["y"])
	
	ballItem.set_pos_and_speed(ballPos, ballVel)
	
