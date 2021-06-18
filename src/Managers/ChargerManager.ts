import { CreepSetup } from "Creep_Setups/CreepSetup";
import { Roles, Setups } from "Creep_Setups/Setups";
import { Manager } from "Manager";
import { Capital } from "Room/Capital";
import { ManagerPriority } from "./ManagerPriority";

export abstract class ChargerManager extends Manager {
    chargers: Creep[]
    setup: CreepSetup
    offset: {x: number, y: number}
    idlePoint: RoomPosition
    extensions: (StructureExtension)[]
    abstract path: RoomPosition[]; //The clockwise path the filler will take
    constructor(capital: Capital, prio = ManagerPriority.Core.charger, direction: DirectionConstant) {
        super({pos:anchor.findPositionAtDirection(direction), capital: capital}, "ChargerManager_" + capital.name + "_" + direction, prio)
        this.setup = Setups.chargers.default
        let anchor = this.capital.anchor
        this.chargers = this.creepsByRole[Roles.charger]


    }

    init() {

    }
    run() {

    }
}
