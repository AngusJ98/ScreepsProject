import { test3 } from "Creep/Creep_Actions";
import { Mission } from "Missions/Mission";
import { createMission } from "Missions/MissionSwitch";
import { Capital } from "Room/Capital";
import { test2 } from "Room/Room_Find";
import { test4 } from "RoomPosition";

export class Empire {
    creepsByCapital: {[name: string]: Creep[]};
    capitals: {[name: string]: Capital};
    missions: Mission[];


    constructor() {
        this.creepsByCapital = this.sortCreeps();
        this.capitals = {} //filled in by capital constructor
        this.missions = [] //filled in with flags
        this.prepareMemory()
    }


    sortCreeps(): {[name: string]: Creep[]} {
        return _.groupBy(Game.creeps, r => r.memory.capital)
    }

    prepareMemory() {


        Memory.username = "Aozin"
        Memory.myRooms = Memory.myRooms || [];
        Memory.skippedRooms = []; //Rooms that were skipped due to lack of cpu, not handled yet
        Memory.capitals = Memory.capitals || {};

        this.cleanCreeps(); //Clean up memory of dead creeps
        this.cleanRooms(); //Clean up memory of dead rooms
    }

    cleanRooms () {
        if (Game.time % 300 === 0) {
          for (const name of Object.keys(Memory.rooms)) {
            if (!Memory.rooms[name].lastSeen) {
                console.log(Game.time, 'Deleting ' + name + ' from memory no `last_seen` value');
                delete Memory.rooms[name];
                continue;
              }
              if (Memory.rooms[name].lastSeen < Game.time - 4000) {
                console.log(Game.time, `Deleting ${name} from memory older than ${4000}`);
                delete Memory.rooms[name];
              }
            }
        }
    }

    cleanCreeps() {
        for (const name in Memory.creeps) {
            if (Game.creeps[name]) {
              continue;
            } else {
                delete Memory.creeps[name];
            }
        }
    }

    build() {
        for (let roomName in Game.rooms) {
            let room: Room = Game.rooms[roomName];
            console.log(room.name)
            if (room.controller && room.controller.my) {
                this.capitals[room.name] = new Capital(room, this)
            }
        }

        for (let flagName in Game.flags) {
            //do something
            let flag: Flag = Game.flags[flagName]
            if (flag.room) {
                let mission = createMission(flag, this)
            }
        }

    }

    init() {
        test2()
        test3()
        test4()
        _.forEach(this.capitals, r => r.init())

    }

    run() {
        _.forEach(this.capitals, r => r.run())
    }

}
