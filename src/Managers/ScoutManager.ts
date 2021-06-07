import { Roles, Setups } from "Creep_Setups/Setups";
import { Manager } from "Manager";
import { Capital } from "Room/Capital";
import { ManagerPriority } from "./ManagerPriority";


export class ScoutManager extends Manager {
    scouts: Creep[]
    targets: string[]

    constructor(capital: Capital, prio = ManagerPriority.Scouting.stationary) {
        super(capital, "ScoutManager_" + capital.name, prio)
        this.scouts = this.creepsByRole[Roles.scout]
        this.targets = this.capital.invisRooms
        console.log(capital.name, " trying to scout ", this.targets)


    }

    private handleScout(scout: Creep) {
        if (scout.memory.targetId) {
            let travelPos = new RoomPosition(25, 25, scout.memory.targetId)
        } else {
            console.log("scout without target")
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
