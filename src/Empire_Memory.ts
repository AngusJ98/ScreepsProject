import * as _ from "lodash"
import { config } from "config";
//functions for handling memory

/**
 *
 * All this code is handled elsewhere now


export function EmpirePrepareMemory() {
    Memory.username = "Aozin"
    Memory.myRooms = Memory.myRooms || [];
    Memory.skippedRooms = []; //Rooms that were skipped due to lack of cpu, not handled yet
    Memory.capitals = Memory.capitals || {};

    EmpireCleanCreeps(); //Clean up memory of dead creeps
    EmpireCleanRooms(); //Clean up memory of dead rooms
}

function EmpireCleanCreeps() {
    for (const name in Memory.creeps) {
        if (Game.creeps[name]) {
          continue;
        } else {
            delete Memory.creeps[name];
        }
    }
}

function EmpireCleanRooms () {
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
*/
