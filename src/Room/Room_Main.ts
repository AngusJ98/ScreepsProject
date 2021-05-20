import { Capital } from "./Capital";
declare global {
  interface Room {
    capital: Capital;
    init(): void;
    run(): void;
  }
}


  //maybe not needed with managers!
  //_.forEach(this.creeps, creep => creep.execute())




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
export function test() {
  //console.log("running")
}

Room.prototype.init = function() {
  if (this.controller && this.controller.my) {
    this.capital = new Capital(this)
    this.capital.init();
    this.memory.lastSeen = Game.time
  }
}

Room.prototype.run = function() {
  if(this.capital) {
    this.capital.run();
  }
}
