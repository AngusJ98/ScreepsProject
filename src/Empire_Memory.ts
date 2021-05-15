import * as _ from "lodash"
//functions for handling memory

Empire.prepareMemory = function() {
    Memory.username = "Aozin"
    Memory.myRooms = Memory.myRooms || [];
    Memory.skippedRooms = []; //Rooms that were skipped due to lack of cpu, not handled yet

    Empire.cleanCreeps(); //Clean up memory of dead creeps
    Empire.cleanRooms(); //Clean up memory of dead rooms
}

Empire.cleanCreeps = function() {
    for (const name in Memory.creeps) {
        if (Game.creeps[name]) {
          continue;
        } else {
            delete Memory.creeps[name];
        }
    }
}

Empire.cleanRooms = function() {
    if (Game.time % 300 === 0) {
      for (const name of Object.keys(Memory.rooms)) {
        if (!Memory.rooms[name].lastSeen) {
            console.log(Game.time, 'Deleting ' + name + ' from memory no `last_seen` value');
            delete Memory.rooms[name];
            continue;
          }
          if (Memory.rooms[name].lastSeen < Game.time - config.room.lastSeenThreshold) {
            console.log(Game.time, `Deleting ${name} from memory older than ${config.room.lastSeenThreshold}`);
            delete Memory.rooms[name];
          }
        }
    }
}
