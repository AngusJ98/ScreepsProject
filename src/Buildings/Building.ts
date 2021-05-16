import { Manager } from "Manager";
import { Capital } from "Room/Capital";

export abstract class Building {
    capital: Capital;
    room: Room;
    pos: RoomPosition;
    abstract name: string;
    manager: Manager | undefined

    constructor(capital: Capital, intstantiator: RoomObject) {
        this.capital = capital
        this.room = intstantiator.room!
        this.pos = intstantiator.pos
        this.capital.buildings.push(this)
    }

    abstract init(): void
    abstract run(): void

}
