class_name SocketIOHandler extends Node

@onready var client: SocketIO = $SocketIO
@export var connectorPanel: ConnectorPanel;

signal connect_signal(color: Dictionary)
signal start_signal(start_state: Dictionary)
signal update_signal(update_state: Dictionary)
signal point_signal(point_state: Dictionary)

var connected: bool = false

func _ready() -> void:	
	client.socket_connected.connect(_on_socket_connected)
	client.event_received.connect(_on_event_received)	
	
	connectorPanel.button.pressed.connect(_on_connect_pressed)	

func _on_connect_pressed() -> void:
	var serveAddress: String = connectorPanel.lineEdit.text
	client.base_url = serveAddress
	client.connect_socket()

func _on_socket_connected(connect_message: String) -> void:
	connected = true
	connectorPanel.visible = false	
	
func _on_socket_disconnected() -> void:
	connected = false
	print("Disconnected")

func _on_event_received(event: String, data: Variant, ns: String) -> void:
	var dict: Dictionary = (data as Array)[0]
	
	if (data as Array).size() > 1:
		print("LONG DATA: " + str(data))
	
	if event == "player:connected":
		connect_signal.emit(dict)		
	elif event == "game:start":
		start_signal.emit(dict)		
	elif event == "game:update":
		update_signal.emit(dict)
	elif event == "game:point":
		point_signal.emit(dict)
