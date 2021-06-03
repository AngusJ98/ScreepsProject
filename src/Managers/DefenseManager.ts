import { Barracks } from "Buildings/Barracks";
import { CreepSetup } from "Creep_Setups/CreepSetup"
import { Roles, Setups } from "Creep_Setups/Setups";
import { Manager } from "Manager";
import { ManagerPriority } from "./ManagerPriority";

export class DefenseManager extends Manager {
    guards: Creep[];
    setup: CreepSetup;
    targets: Creep[];
    needed: number;
    constructor(barracks: Barracks, prio = ManagerPriority.OutpostDefense.outpostDefense) {
        super(barracks, "DefenseManager_" + barracks.coreSpawn.id, prio);
        this.guards = this.creepsByRole[Roles.guardMelee]
        this.setup = Setups.guards.armored
        this.targets = _.flatten(_.map(this.capital.allRooms, r => r.hostiles))
        this.needed = this.targets.length
    }

    private handleGuard(guard: Creep) {
        let target = guard.pos.findClosestByMultiRoomRange(this.targets)
        if(target) {
            guard.goMelee(target)
        } else {
            let spawn = guard.pos.findClosestByMultiRoomRange(this.capital.spawns);
            if (spawn && guard.pos.getMultiRoomRangeTo(spawn.pos) > 1) {
                guard.travelTo(spawn)
            } else if (spawn) {
                spawn.recycleCreep(guard)
            } else {
                guard.suicide
            }

        }
    }

    init(): void {
        console.log("HOSTILES: ", this.needed)
        this.spawnList(this.needed, this.setup)
    }

    run(): void {
        _.forEach(this.guards, r => this.handleGuard(r))
    }
}
