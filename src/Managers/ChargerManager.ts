import { CreepSetup } from "Creep_Setups/CreepSetup";
import { Roles, Setups } from "Creep_Setups/Setups";
import { Manager } from "Manager";
import { minBy } from "Rando_Functions";
import { Bunker} from "Room/Bunker";
import { Capital } from "Room/Capital";
import { ManagerPriority } from "./ManagerPriority";

export class ChargerManager extends Manager {
    chargers: Creep[]
    setup: CreepSetup
    idlePoint: RoomPosition
    anchor: RoomPosition
    fillTargets: (StructureExtension | StructureTower | StructureSpawn)[]
    spawns: StructureSpawn[]
    path: RoomPosition[]; //The clockwise path the filler will take
    constructor(capital: Capital, direction: 6 | 8 | 2, prio = ManagerPriority.Core.charger) {
        let idle = capital.anchor!.findPositionAtDirection(direction)
        super({pos: idle, capital: capital}, "ChargerManager_" + capital.name + "_" + direction, prio)
        this.idlePoint = idle
        this.setup = Setups.chargers.default
        this.anchor = this.capital.anchor!
        this.chargers = this.creepsByRole[Roles.charger]
        this.path = Bunker.getPathFromList(this.anchor, Bunker.bunkerPath[direction])

        this.fillTargets = Bunker.getFillStructuresFromList(this.anchor, Bunker.bunkerFillTargets[direction])
        this.spawns = Bunker.getSpawnsFromList(this.anchor, Bunker.spawnTargets[direction])
    }

    idleActions(charger: Creep) {

        if (charger.store.energy < charger.store.getCapacity()) {
            charger.withdraw(this.capital.storage!, RESOURCE_ENERGY)

        } else if (this.room!.energyAvailable < this.room!.energyCapacityAvailable || this.capital.towerNeedFilling) {

            let targets  = _.filter(charger.pos.findInRange(this.fillTargets, 1), r => r.energy < r.energyCapacity)
            //charger.say("" + targets.length)
            if (targets.length > 1) {
                charger.transfer(targets[0], RESOURCE_ENERGY)
                return
            } else if (targets.length == 1) {
                charger.transfer(targets[0], RESOURCE_ENERGY)
            } else {
                charger.moveByPath(this.path)
                targets  = _.filter(charger.pos.findInRange(this.fillTargets, 1), r => r.energy < r.energyCapacity)
                if (targets.length > 0) {
                    charger.transfer(targets[0], RESOURCE_ENERGY)
                }
            }
        } else {
            charger.say("💤")
        }
    }

    travelActions(charger:Creep) {
        if (charger.store.energy == 0) {
            charger.moveByPath(this.path)
        } else {
            let targets  = _.filter(charger.pos.findInRange(this.fillTargets, 1), r => r.store.energy < r.store.getCapacity(RESOURCE_ENERGY))
            charger.say("🚬")
            if (targets.length > 1) {
                charger.transfer(targets[0], RESOURCE_ENERGY)
                return
            } else if (targets.length == 1) {
                charger.transfer(targets[0], RESOURCE_ENERGY)
                charger.moveByPath(this.path)
            } else {
                charger.moveByPath(this.path)
            }
        }
    }

    handleCharger(charger: Creep) {
        if (charger.pos.isEqualTo(this.idlePoint)) {
            this.idleActions(charger)
        } else if (_.some(this.path, r => r.isEqualTo(charger.pos))) {
            this.travelActions(charger)
        } else {
            charger.say("🚬")
            charger.travelTo(this.idlePoint)
        }
    }

    init() {

        if (this.chargers && this.chargers.length == 0 && this.room!.energyAvailable < 300) {
            this.spawnList(1, Setups.chargers.early)
        } else {
            let needed = (this.chargers && this.chargers[0] && this.chargers[0].body.length < 5)? 2 : 1
            this.spawnList(needed, this.setup)
        }


    }
    run() {
        _.forEach(this.chargers, r => this.handleCharger(r))
        if (this.chargers && this.chargers.length > 1 && !(_.some(this.chargers, r => r.spawning))) {
            minBy(this.filterLife(this.chargers), r => r.body.length )?.suicide()
        }
    }
}
