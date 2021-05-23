import { Capital } from "Room/Capital";

type MissionConstant = "Settle" | "Attack" | "Siege" | "New_Room_Setup"

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

    constructor(flag: Flag) {
        this.memory = flag.memory as FlagMemory;
        this.name = flag.name;
        this.pos = flag.pos;
        this.room = flag.room;
        this.capital = this.getCapital();
    }

    getCapital(): Capital | undefined{
        return //Leaving this todo as Empire needs rework
    }
}
