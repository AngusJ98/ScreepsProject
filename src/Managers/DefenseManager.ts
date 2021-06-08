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
    invaderCore: StructureInvaderCore[];
    constructor(barracks: Barracks, prio = ManagerPriority.OutpostDefense.outpostDefense) {
        super(barracks, "DefenseManager_" + barracks.coreSpawn.id, prio);
        this.guards = this.creepsByRole[Roles.guardMelee]
        this.setup = Setups.guards.armored
        this.targets = _.flatten(_.map(this.capital.allRooms, r => r.hostiles))
        this.invaderCore = _.flatten(_.map(this.capital.allRooms, r => r.find(FIND_HOSTILE_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_INVADER_CORE})))  as StructureInvaderCore[]
        this.needed = this.targets.length + this.invaderCore.length

    }

    private handleGuard(guard: Creep) {
        let target = guard.pos.findClosestByMultiRoomRange(this.targets)
        if(target) {
            guard.goMelee(target)
        } else if (this.invaderCore[0]) {
            guard.goMelee(this.invaderCore[0])
        } else {
            let spawn = guard.pos.findClosestByMultiRoomRange(this.capital.spawns);
            if (spawn && guard.pos.getMultiRoomRangeTo(spawn.pos) > 1) {
                guard.travelTo(spawn)
            } else if (spawn) {
                spawn.recycleCreep(guard)
            } else {
                guard.suicide()
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
