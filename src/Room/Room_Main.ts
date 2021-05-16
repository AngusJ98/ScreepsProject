interface Room {
  execute(): void;
  handle(): void;
}

Room.prototype.execute = function() {
  this.handle();

  //maybe not needed with managers!
  //_.forEach(this.creeps, creep => creep.execute())



    this.memory.lastSeen = Game.time;
}
/*
DEPRECATED WITH ROOM_FIND!
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
*/

Room.prototype.handle = function() {
  if (this.controller && this.controller.my) {

  }
}
