import { Empire } from "Empire";
import { Manager } from "Manager";
import { Capital } from "Room/Capital";

type MissionConstant = "Settle" | "Attack" | "Siege" | "Setup"

interface FlagMemory {
    capital?: string;
    roomName?: string;
    type: MissionConstant;
}

export abstract class Mission {
    memory: FlagMemory;
    capital: Capital | undefined;
    flag: Flag;
    pos: RoomPosition;
    room?: Room;
    name: string;
    manager: Manager | undefined;
    empire: Empire;
    scoutingNeeded: boolean = false

    constructor(flag: Flag, empire: Empire) {
        this.memory = flag.memory as FlagMemory;
        this.flag = flag
        this.name = flag.name + flag.pos.roomName;
        this.empire = empire;
        this.pos = flag.pos;
        this.room = flag.room;
        if (!this.memory.roomName) {
            this.memory.roomName = this.pos.roomName
        }
        if (this.scoutingNeeded && this.capital) {
            Memory.capitals[this.capital.name].scoutTargets.push(this.pos.roomName)
        }
        this.capital = this.getCapital();
        this.capital?.missions.push(this);
    }



    getCapital(): Capital | undefined{
        if (this.memory.capital) {
            return this.empire.capitals[this.memory.capital]
        } else {
            let nearestCapital = this.findClosestCapital()
            this.memory.capital = nearestCapital? nearestCapital.name : undefined
            return nearestCapital
        }
    }

    findClosestCapital(): Capital | undefined {
        let nearestCapital: Capital | undefined;
		let minDistance = Infinity;
        for (let name in this.empire.capitals) {
            let capital = this.empire.capitals[name]

            let length = PathFinder.search(this.pos, capital.pos).path.length
            if (length < minDistance && this.filter(capital)) {
                minDistance = length
                nearestCapital = capital
            }

        }
        return nearestCapital
    }
    abstract filter(capital: Capital): boolean;
    abstract init(): void;
    abstract run(): void;
}
