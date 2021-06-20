import { CreepSetup } from "Creep_Setups/CreepSetup";
import { Roles, Setups } from "Creep_Setups/Setups";
import { Manager } from "Manager";
import { Bunker} from "Room/Bunker";
import { Capital } from "Room/Capital";
import { ManagerPriority } from "./ManagerPriority";

export abstract class ChargerManager extends Manager {
    chargers: Creep[]
    setup: CreepSetup
    idlePoint: RoomPosition
    anchor: RoomPosition
    fillTargets: (StructureExtension | StructureTower | StructureSpawn)[]
    path: RoomPosition[]; //The clockwise path the filler will take
    constructor(capital: Capital, prio = ManagerPriority.Core.charger, direction: 6 | 8 | 2) {
        let idle = capital.anchor!.findPositionAtDirection(direction)
        super({pos: idle, capital: capital}, "ChargerManager_" + capital.name + "_" + direction, prio)
        this.idlePoint = idle
        this.setup = Setups.chargers.default
        this.anchor = this.capital.anchor!
        this.chargers = this.creepsByRole[Roles.charger]
        this.path = Bunker.getPathFromList(this.anchor, Bunker.bunkerPath[direction])

        this.fillTargets = Bunker.getFillStructuresFromList(this.anchor, Bunker.bunkerFillTargets[direction])

    }

    init() {

    }
    run() {

    }
}
