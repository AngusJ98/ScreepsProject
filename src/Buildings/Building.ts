import { Manager } from "Manager";
import { Capital } from "Room/Capital";

export interface buildingInstantiator {
    room?: Room;
    pos: RoomPosition;
}

export abstract class Building {
    capital: Capital;
    room: Room;
    pos: RoomPosition;
    abstract name: string;
    abstract manager: Manager | undefined;

    constructor(capital: Capital, intstantiator: buildingInstantiator) {
        //console.log(JSON.stringify(intstantiator))
        this.capital = capital
        this.room = intstantiator.room!
        this.pos = intstantiator.pos
        this.capital.buildings.push(this)
    }

    abstract init(): void
    abstract run(): void

}
