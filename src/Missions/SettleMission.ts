import { Empire } from "Empire";
import { Manager } from "Manager";
import { Mission } from "./Mission";


export class SettleMission extends Mission {
    manager: Manager;
    constructor(flag: Flag, empire: Empire) {
        super(flag, empire)

    }
}
