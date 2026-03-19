class_name TeamHandler extends Node

@export var texture: Texture2D;

func _ready() -> void:
	pass

func set_player_data(id: int, position: Vector2, speed: Vector2):
	(get_children()[id] as ItemHandler).set_pos_and_speed(position, speed)
	
func set_active(active: bool):
	for child in get_children():
		var item = child as ItemHandler
		item.set_active(active)
