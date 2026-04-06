class_name GameLogic extends Node

var active: bool = false
var players_state: Array = []
var ball: Dictionary = {}
var controlled_team: String = ""
var ai_strategy = AIBalancedStrategy.new()

signal send_signal(event: String, data: Variant, ns: String)

func set_active(active_value: bool):
	active = active_value

func set_controlled_team(team: String):
	controlled_team = team

func receive_game_state(game_state: Dictionary):
	players_state = game_state.get("players", [])
	ball = game_state.get("ball", {})

func _process(_delta: float) -> void:
	if not active:
		return
	if controlled_team == "":
		return
	if ball.is_empty():
		return

	var controls: Array = ai_strategy.compute_controls(controlled_team, players_state, ball)
	var out_data: Dictionary = {"controls": controls}
	send_signal.emit("player:controls", out_data, "/")
