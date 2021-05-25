import { Empire } from "Empire";
import { Manager } from "Manager";
import { Capital } from "Room/Capital";

type MissionConstant = "Settle" | "Attack" | "Siege" | "Setup"

interface FlagMemory {
    capital: string;
    type: MissionConstant;
}

export abstract class Mission {
    memory: FlagMemory;
    capital: Capital | undefined;
    pos: RoomPosition;
    room: Room | undefined;
    name: string;
    manager: Manager | undefined;
    empire: Empire;

    constructor(flag: Flag, empire: Empire) {
        this.memory = flag.memory as FlagMemory;
        this.name = flag.name;
        this.empire = empire;
        this.pos = flag.pos;
        this.room = flag.room;
        this.capital = this.getCapital();
        this.empire.missions.push(this);
    }

    getCapital(): Capital | undefined{
        return //Leaving this todo as Empire needs rework
    }
}
