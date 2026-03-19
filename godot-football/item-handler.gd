class_name ItemHandler extends Node

var speed: Vector2 = Vector2(0, 0)
var game_pos: Vector2 = Vector2()

var diameter: float = 1
var fieldSize: float = 15

var active: bool = false;

func _ready() -> void:
	set_diameter(diameter)

func _process(delta: float) -> void:
	if active:
		game_pos += delta * speed 
		calc_global()

func set_pos_and_speed(posIn: Vector2, speedIn: Vector2 = Vector2(0,0)):
	game_pos = posIn
	speed = speedIn
	calc_global()

func calc_global():
	var size = get_viewport().get_visible_rect().size
	
	var x: float = game_pos.x / fieldSize * size.y
	var y: float = game_pos.y / fieldSize * size.y 
	
	self.position = Vector2(x, y)

func set_diameter(diamater: float):
	self.diameter = diamater
	self.scale = Vector2(0.42 * diameter, 0.42 * diameter)
	
func set_active(activeIn: bool):
	active = activeIn
