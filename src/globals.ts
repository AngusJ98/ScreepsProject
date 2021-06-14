declare function derefRoomPosition(protoPos: ProtoPos): RoomPosition;

global.derefRoomPosition = function(protoPos: ProtoPos): RoomPosition {
	return new RoomPosition(protoPos.x, protoPos.y, protoPos.roomName);
};
