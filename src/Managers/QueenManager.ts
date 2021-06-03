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
    constructor(barracks: Barracks,  prio = ManagerPriority.Core.queen) {
        super (barracks, "QueenManager_"+ barracks.coreSpawn.id, prio);
        this.barracks = barracks;
        this.queens = this.creepsByRole[Roles.queen];
        this.queenSetup = this.capital.storage ? Setups.queens.default : Setups.queens.early;
        this.targets = _.filter(this.barracks.energyStructures, r => r.store.getFreeCapacity(RESOURCE_ENERGY)! > 0)
        this.towers = _.filter(this.capital.towers, r => r.energy < r.energyCapacity);
        this.targets = this.targets.concat(this.towers)
    }

    private handleQueen(queen: Creep) {
        if (queen.store.energy > 0) {
            this.transferActions(queen)
        } else {
            this.withdrawActions(queen)
        }

    }

    transferActions(queen: Creep) {
        let target = queen.pos.findClosestByPath(this.targets)
        if(target) {
            queen.goTransfer(target)
        } else {
            this.withdrawActions(queen)
        }
    }

    withdrawActions(queen: Creep) {
        let drops = _.filter(this.room.droppedEnergy, r => r.amount >= queen.store.getCapacity()/4)
        let structs = _.filter(_.compact([this.capital.storage, this.capital.terminal]), r => r!.energy > 0)
        let tombs = _.filter(this.capital.room.tombstones, r => r.store.energy > queen.store.getCapacity()/4)
        let targets = _.merge(drops,structs,tombs)
        //console.log(JSON.stringify(this.room.drops))
        let target = queen.pos.findClosestByRange(targets);
        if(target) {
            queen.goWithdraw(target)
        }
    }

    init(): void {
        let pre = this.barracks.spawns.length <= 1 ? 100 : 50;
        this.spawnList(1, this.queenSetup, {prespawn: pre})
        if (this.queens && this.queens.length == 1 && this.queens[0].body.length < 5) {
            this.spawnList(2, this.queenSetup, {prespawn: pre})
        }
    }


    run(): void {
        _.forEach(this.queens, r => this.handleQueen(r));

    }
}
