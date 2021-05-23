import { type } from "os";
import { Capital } from "Room/Capital";

type MissionConstant = "Settle" | "Attack" | "Siege" | "New_Room_Setup"

interface FlagMemory {
    capital: string;
    type: MissionConstant;
}

export abstract class Mission {
    memory: FlagMemory;
    capital: Capital;
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

    getCapital(colonyFilter?: (capital: Capital) => boolean): Capital {
        if (this.memory.capital) {
            return global.capitals[this.memory.capital]
        } else {
            let names = _.keys(capitals)
        }
    }
}
