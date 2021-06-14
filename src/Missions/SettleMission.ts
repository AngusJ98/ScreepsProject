import { Empire } from "Empire";
import { Manager } from "Manager";
import { Capital } from "Room/Capital";
import { Mission } from "./Mission";
import { SettleManager } from "./SettleManager";


export class SettleMission extends Mission {
    manager: Manager | undefined;
    controller?: StructureController

    constructor(flag: Flag, empire: Empire) {

        super(flag, empire)
        this.scoutingNeeded = true;
        this.controller = this.room? this.room.controller : undefined
        if(this.capital) {
            this.manager = new SettleManager(this)
        }
    }
    filter(capital: Capital): boolean {

        return capital.barracks? capital.level >= 5 : false
    }

    init(): void {

    }

    run(): void {

    }
}
