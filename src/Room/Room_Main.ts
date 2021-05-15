Room.prototype.execute = function() {




    this.memory.lastSeen = Game.time;
}

function initMemory(room: Room) {
    if (room.memory.sources === undefined) {
      room.memory.sources = room.sources.length;
    }
    if (room.memory.controllerId === undefined) {
      room.memory.controllerId = null;
      if (room.controller) {
        room.memory.controllerId = room.controller.id;
      }
    }
    room.memory.hostileCreepCount = room.hostiles.length;
}

