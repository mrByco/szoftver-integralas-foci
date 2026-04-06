extends RefCounted
class_name AIBalancedStrategy

func compute_controls(team: String, players: Array, ball: Dictionary) -> Array:
	var my_players: Array = []
	for p in players:
		if p.get("team", "") == team:
			my_players.append(p)

	if my_players.is_empty():
		return []

	var own_goal_x: float = -10.0 if team == "red" else 10.0
	var dir: float = 1.0 if team == "red" else -1.0
	var ball_pos := _dict_to_vec2(ball.get("pos", {}))

	var controls: Array = []
	for player in my_players:
		var player_id: int = int(player.get("id", -1))
		var local_id: int = _local_id(player_id)
		var player_pos := _dict_to_vec2(player.get("pos", {}))
		var target := Vector2.ZERO

		if local_id == 0:
			var gk_x: float = own_goal_x + dir * 1.5
			var ball_near: bool = (ball_pos.x - own_goal_x) * dir < 6.0
			target = Vector2(gk_x, _clamp(ball_pos.y, -3.0, 3.0) if ball_near else 0.0)
		elif local_id == 1:
			var mid_x: float = (ball_pos.x + own_goal_x) / 2.0
			var d_min: float = min(own_goal_x + dir * 2.0, own_goal_x + dir * 6.0)
			var d_max: float = max(own_goal_x + dir * 2.0, own_goal_x + dir * 6.0)
			target = Vector2(_clamp(mid_x, d_min, d_max), ball_pos.y * 0.7)
		elif local_id == 2:
			target = Vector2(own_goal_x + dir * 3.0, -ball_pos.y * 0.5)
		elif local_id == 3:
			target = ball_pos
		else:
			var lead_x: float = _clamp(ball_pos.x + dir * 3.0, -9.0, 9.0)
			target = Vector2(lead_x, ball_pos.y * 0.4)

		var delta := target - player_pos
		var vel := Vector2.ZERO
		if delta.length() >= 0.2:
			vel = delta.normalized()

		controls.append({
			"id": player_id,
			"velocity": {"x": vel.x, "y": vel.y}
		})

	return controls

func _local_id(player_id: int) -> int:
	var x := player_id % 10
	return x % 5

func _dict_to_vec2(v: Dictionary) -> Vector2:
	return Vector2(float(v.get("x", 0.0)), float(v.get("y", 0.0)))

func _clamp(value: float, min_v: float, max_v: float) -> float:
	return max(min_v, min(max_v, value))
