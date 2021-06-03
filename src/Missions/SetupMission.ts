import { Empire } from "Empire";
import { Manager } from "Manager";
import { Capital } from "Room/Capital";
import { Mission } from "./Mission";
import { SettleManager } from "./SettleManager";
import { SetupManager } from "./SetupManager";

export class SetupMission extends Mission {
    manager: Manager | undefined;
    controller?: StructureController
    constructor(flag: Flag, empire: Empire) {

        super(flag, empire)
        //console.log("hi")
        //console.log(this.capital?.room)
        if(this.room && this.capital) {
            this.manager = new SetupManager(this)
            this.controller = this.room.controller
        } else if (this.capital && this.memory.roomName) {
            this.capital.observer?.observeRoom(this.memory.roomName)
        }

    }

    init(): void {
        if (this.room.spawns.length >= 1 && this.controller!.level >= 3) {
            this.flag.remove()
        }
    }

    run(): void {

    }
}
