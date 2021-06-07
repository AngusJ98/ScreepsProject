import { Roles, Setups } from "Creep_Setups/Setups";
import { Manager } from "Manager";
import { Capital } from "Room/Capital";
import { ManagerPriority } from "./ManagerPriority";


export class ScoutManager extends Manager {
    scouts: Creep[]
    targets: string[]

    constructor(capital: Capital, prio = ManagerPriority.Scouting.stationary) {
        super(capital, "ScoutManager_" + capital.name, prio)
        this.scouts = this.creepsByRole[Roles.scout] || []
        this.targets = this.capital.invisRooms
        console.log(capital.name, " trying to scout ", this.targets)


    }

    private handleScout(scout: Creep) {
        if (scout.memory.targetId && (scout.memory.targetId != scout.room.name || scout.pos.x == 0 || scout.pos.y == 0 || scout.pos.x == 49 || scout.pos.y == 49)) {
            let travelPos = new RoomPosition(25, 25, scout.memory.targetId)
            scout.travelTo(travelPos)
        } else if (scout.memory.targetId == undefined) {
            console.log("scout without target in room ", scout.room, "with target ", scout.memory.targetId)
            //scout.suicide()
        }
    }

    init(): void {
        let currentServed = _.map(this.scouts, r => r.memory.targetId)
        _.remove(this.targets, r => currentServed.includes(r))
        if (this.targets.length > 0) {
            this.spawnList(this.scouts.length + 1, Setups.scout, {targetId: this.targets[0]})
        }
    }
    run(): void {
        _.forEach(this.scouts, r => this.handleScout(r))
    }
}
