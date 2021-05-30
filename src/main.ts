import {Traveler} from "Traveler"
import { Empire } from "Empire";

declare global {
  /*
    Example types, expand on these or remove them and add your own.
    Note: Values, properties defined here do no fully *exist* by this type definiton alone.
          You must also give them an implemention if you would like to use them. (ex. actually setting a `role` property in a Creeps memory)

    Types added in this `global` block are in an ambient, global context. This is needed because `main.ts` is a module file (uses import or export).
    Interfaces matching on name from @types/screeps will be merged. This is how you can extend the 'built-in' interfaces from @types/screeps.
  */
  // Memory extension samples
  interface Memory {
    uuid: number;
    log: any;
    myRooms: any;
    username: string;
    rooms: {[name:string]: RoomMemory}
    skippedRooms: Room[]
    capitals: {
      outposts: string[];
    }
  }

  // Syntax for adding proprties to `global` (ex "global.log")
  namespace NodeJS {
    interface Global {
      log: any;
    }
  }
}



export function loop(): void {

  var empire:Empire = new Empire();

  empire.build();
  empire.init();
  empire.run();
  //@ts-ignore
  if(Game.cpu.bucket == 10000) {
    //@ts-ignore
    Game.cpu.generatePixel();
  }

  for (let room in Game.rooms) {
    defendRoom(room)
  }
}
//@ts-nocheck
function defendRoom(roomName:string) {
  var hostiles = Game.rooms[roomName].find(FIND_HOSTILE_CREEPS);
  var towers: StructureTower[] = Game.rooms[roomName].find(
      FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_TOWER}}) as StructureTower[];
  if(hostiles.length > 0) {
      var username = hostiles[0].owner.username;
      Game.notify(`User ${username} spotted in room ${roomName}`);

      towers.forEach(tower => tower.attack(hostiles[0]));
  } else {
      let healCreeps = _.filter(Game.rooms[roomName].find(FIND_MY_CREEPS), r => r.hits < r.hitsMax)
      if (healCreeps.length > 0) {
          towers.forEach(r => r.heal(healCreeps[0]))
      }
  }
}

Creep.prototype.travelTo = function(destination: RoomPosition|{pos: RoomPosition}, options?: TravelToOptions) {
  return Traveler.travelTo(this, destination, options);
};



// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
/*
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);
  Empire.main.execute();
  test()
});
*/
