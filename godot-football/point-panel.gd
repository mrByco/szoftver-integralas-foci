class_name PointPanel extends Panel

@export var red_label: Label;
@export var blue_label: Label;

@export var start_button: Button;

func set_point(point_dict: Dictionary):
	var red_score: int = point_dict["red"]
	var blue_score: int = point_dict["blue"]
	
	red_label.text = str(red_score)
	blue_label.text = str(blue_score)
	
