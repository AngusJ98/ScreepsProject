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
    abstract path: RoomPosition[]; //The clockwise path the filler will take
    constructor(pos: RoomPosition, capital: Capital, prio = ManagerPriority.Core.charger, direction: DirectionConstant) {
        super(capital, "ChargerManager_" + capital.name + "_" + direction, prio)
        this.setup = Setups.chargers.default
        let anchor = this.capital.anchor
        this.idlePoint = anchor.findPositionAtDirection(direction)
        this.chargers = this.creepsByRole[Roles.charger]

    }

    init() {

    }
    run() {

    }
}
