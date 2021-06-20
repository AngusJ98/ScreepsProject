import { Barracks } from "Buildings/Barracks";
import { CreepSetup } from "Creep_Setups/CreepSetup";
import { Roles, Setups } from "Creep_Setups/Setups";
import { Manager } from "Manager";
import { ManagerPriority } from "./ManagerPriority";


export class QueenManager extends Manager {
    barracks: Barracks;
    queens: Creep[];
    queenSetup: CreepSetup;
    refillTowersBelow = 500;
    targets: (StructureExtension | StructureSpawn | StructureTower)[]
    towers: StructureTower[];
    room: Room
    constructor(barracks: Barracks,  prio = ManagerPriority.Core.queen) {
        super (barracks, "QueenManager_"+ barracks.coreSpawn.id, prio);
        this.barracks = barracks;
        this.room = barracks.room
        this.queens = this.creepsByRole[Roles.queen];
        this.queenSetup = this.capital.storage ? Setups.queens.default : Setups.queens.early;
        this.targets = _.filter(this.barracks.energyStructures, r => r.store.getFreeCapacity(RESOURCE_ENERGY)! > 0)
        this.towers = _.filter(this.capital.towers, r => r.energy < r.energyCapacity);
        this.targets = this.targets.concat(this.towers)
    }

    private handleQueen(queen: Creep) {
        if (queen.store.energy > 0) {
            queen.say("T")
            this.transferActions(queen)
        } else {
            queen.say("W")
            this.withdrawActions(queen)
        }

    }

    transferActions(queen: Creep) {
        const target = queen.pos.findClosestByPath(this.targets)
        if(target) {
            queen.goTransfer(target)
        } else {
            this.withdrawActions(queen)
        }
    }

    withdrawActions(queen: Creep) {
        const drops = _.filter(this.room.droppedEnergy, r => r.amount >= queen.store.getCapacity()/2)
        const structs = _.filter(_.compact([this.capital.storage, this.capital.terminal, ...this.capital.containers]), r => r!.store[RESOURCE_ENERGY] && r!.store[RESOURCE_ENERGY] >= queen.store.getCapacity()) as (StructureStorage | StructureTerminal | StructureContainer)[]
        const tombs = _.filter(this.capital.room.tombstones, r => r.store.energy > queen.store.getCapacity()/4)
        let targets: (Resource | StructureStorage | StructureTerminal | StructureContainer | Tombstone)[] = []
        targets = targets.concat(...drops,...structs,...tombs)
        //console.log(JSON.stringify(this.room.drops))
        const target = queen.pos.findClosestByPath(targets)
        if(target) {
            queen.goWithdraw(target)
        } else {
            queen.say("No target")
        }
    }

    init(): void {
        const pre = this.barracks.spawns.length <= 1 ? 100 : 50;
        this.spawnList(1, this.queenSetup, {prespawn: pre})
        if (this.queens && this.queens.length == 1 && this.queens[0].body.length < 5) {
            this.spawnList(2, this.queenSetup, {prespawn: pre})
        }
    }


    run(): void {
        _.forEach(this.queens, r => this.handleQueen(r));

    }
}
