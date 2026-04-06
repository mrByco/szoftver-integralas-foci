extends Node

@export var socketIOHandler: SocketIOHandler

@export var playerNr: int;
@export var red_handler: TeamHandler;
@export var blue_handler: TeamHandler;
@export var item: ItemHandler;

@export var ball_diamater: float;
@export var player_diamater: float;

@export var point_panel: PointPanel;
@export var goal_panel: GoalPanel;

@export var game_logic: GameLogic;

var ballItem: ItemHandler;

var myColor: String = ""

func _ready() -> void:
	socketIOHandler.connect_signal.connect(receive_color)
	socketIOHandler.start_signal.connect(receive_start)
	socketIOHandler.update_signal.connect(receive_update)
	socketIOHandler.point_signal.connect(receive_point)
	
	game_logic.send_signal.connect(socketIOHandler.send_data)
	
	ballItem = item.duplicate() as ItemHandler;
	ballItem.name = "Ball"
	ballItem.visible = true
	add_child(ballItem)
	ballItem.set_diameter(ball_diamater)
	
	point_panel.start_button.pressed.connect(func():
		socketIOHandler.send_data("game:start-request", "", "/")
	)
	
	var radius: float = 6
	
	for i in range(playerNr):
		var new_red_player = item.duplicate() as ItemHandler	
		new_red_player.name = str(i)
		var angle_red: float = deg_to_rad(90 + 18 + 36 * i)
	
		new_red_player.visible = true
		red_handler.add_child(new_red_player)
		new_red_player.texture = red_handler.texture
		new_red_player.set_pos_and_speed(Vector2(radius * cos(angle_red), radius * sin(angle_red)))
		new_red_player.set_diameter(player_diamater)
		
		var new_blue_player = item.duplicate() as ItemHandler
		new_blue_player.name = str(i)
		var angleBlue: float = deg_to_rad(90 - 18 - 36 * i) 
		
		new_blue_player.visible = true
		blue_handler.add_child(new_blue_player)
		new_blue_player.texture = blue_handler.texture		
		new_blue_player.set_pos_and_speed(Vector2(radius * cos(angleBlue), radius * sin(angleBlue)))
		new_blue_player.set_diameter(player_diamater)
	
func receive_color(color: Dictionary):
	myColor = color["color"]
	game_logic.set_controlled_team(myColor)

func receive_start(start_state: Dictionary):
	game_logic.set_active(true)
	ballItem.set_active(true)	
	red_handler.set_active(true)
	blue_handler.set_active(true)
	#game_logic.set_controlled_team()
	
func receive_update(update_state: Dictionary):
	process_state_message(update_state)
	game_logic.receive_game_state(update_state)
		
func receive_point(point_state: Dictionary):
	var team: String = point_state["team"]
	
	if team != null and team != "":
		pass
	
	point_panel.set_point(point_state)

func process_state_message(state: Dictionary):
	var players = state["players"]
	
	for player in players:
		var position: Vector2 = Vector2(player["pos"]["x"],player["pos"]["y"])
		var speed: Vector2 = Vector2(player["velocity"]["x"],player["velocity"]["y"])
		
		var id: int = player["id"]
		id = id % 10
		id = id % 5
		
		if player["team"] == "red":
			red_handler.set_player_data(id, position, speed)
		if player["team"] == "blue":
			blue_handler.set_player_data(id, position, speed)
		
	var ball = state["ball"]	
	var ballPos: Vector2 = Vector2(ball["pos"]["x"], ball["pos"]["y"])
	var ballVel: Vector2 = Vector2(ball["velocity"]["x"], ball["velocity"]["y"])
	
	ballItem.set_pos_and_speed(ballPos, ballVel)
	
