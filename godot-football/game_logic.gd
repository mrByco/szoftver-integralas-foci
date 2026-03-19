class_name GameLogic extends Node

var active: bool = false

var teams: Dictionary;
var ball: Dictionary

var start_time: float = 0;

signal send_signal(event: String, data: Variant, ns: String)

func set_active(active: bool):
	self.active = active
	
func _ready() -> void:
	teams["red"] = Dictionary()
	teams["blue"] = Dictionary()
	start_time = Time.get_ticks_msec()

func receive_game_state(game_state: Dictionary):	
	for player in game_state["players"]:	
		var team: String = player["team"]
		var id: int = player["id"]
		var pos: Dictionary = player["pos"]
		var vel: Dictionary = player["velocity"]
		teams[team][id % 10] = {"pos" : pos, "vel": vel }
	
	ball = game_state["ball"]

func create_velocity_dict(id: int, x: float, y: float) -> Dictionary: 
	return {
		"id": id,
		"velocity" : {"x": x, "y": y}
	}

func _process(delta: float) -> void:
	if self.active:
		var x: float = sin(2 * PI / 10 * (Time.get_ticks_msec() - start_time))
		var dict = create_velocity_dict(0, x, 0)
		var input = []
		input.append(dict)
		
		var outData = {"controls": input}
		send_signal.emit("player:controls", outData, "/")
