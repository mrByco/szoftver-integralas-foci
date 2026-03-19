class_name GoalPanel extends Panel

@export var label: Label;

@export var time_out: float = 3;

func set_goal(team: String):
	label.text = "GOAL: %s" % team
	self.visible = true
	
	await get_tree().create_timer(time_out).timeout
	hide_panel()

func hide_panel():
	self.visible = false
