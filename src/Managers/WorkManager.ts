/* eslint-disable prefer-const */
import { CreepSetup } from "Creep_Setups/CreepSetup";
import { Roles, Setups } from "Creep_Setups/Setups";
import { Manager } from "Manager";
import { config } from "config";
import { Capital, CapitalSize } from "Room/Capital";
import { ManagerPriority } from "./ManagerPriority";

export class WorkManager extends Manager {
    workers: Creep[];
    setup: CreepSetup;
    room: Room;
    repairTargets: Structure[];
    deconstructTargets: Structure[];
    fortifyTargets: (StructureWall | StructureRampart)[];
    criticalTargets: (StructureWall | StructureRampart)[];
    constructionSites: ConstructionSite[];
    barrierHits: {[rcl: number]: number}  = {			// What HP to fortify at each RCL
        1       : 3e+3,
        2       : 3e+3,
        3       : 1e+4,
        4       : 5e+4,
        5       : 1e+5,
        6       : 5e+5,
        7       : 1e+6,
        //8       : 1e+6,
        8       : 2e+7,
    };
    hitsGoal: number;
    critical = 2500;
    tolerance = 100000;
    fortifyThreshold = 300000;
    repair: boolean

    constructor(capital: Capital, prio = ManagerPriority.Capital.work) {
        super(capital, "WorkManager_" + capital.name, prio)
        this.workers = this.creepsByRole[Roles.worker];
        this.setup = this.capital.level == 1 ? Setups.workers.early : Setups.workers.default;
        this.room = capital.room
        this.repair = true
        this.hitsGoal = this.barrierHits[this.capital.level]
        this.fortifyTargets = _.filter(this.room.barriers, r => r.hits < this.hitsGoal);
        this.criticalTargets = _.filter(this.fortifyTargets, r => r.hits < this.critical);
        this.deconstructTargets = _.merge(this.room.hostileStructures, Game.getObjectById("60bf1d5b6b88b71cd5595c5c"))
        this.repairTargets = _.filter(_.compact(this.capital.repairables), r => r.hits < 0.8 * r.hitsMax);
        _.forEach(this.capital.miningSites, r => _.remove(this.repairTargets, t => r.container && t.id == r.container.id))
        this.constructionSites = this.capital.constructionSites;
    }

    private deconstructActions(worker: Creep): boolean {
        let target = worker.pos.findClosestByMultiRoomRange(this.deconstructTargets)
        if (target) {
            worker.goDeconstruct(target);
            return true;
        }
        return false;
    }

    private buildActions(worker: Creep): boolean {
        let target = worker.pos.findClosestByMultiRoomRange(this.constructionSites);
        if (target) {
            worker.goBuild(target);
            return true;
        }
        return false;
    }

    private repairActions(worker: Creep): boolean {
        let target = worker.pos.findClosestByMultiRoomRange(this.repairTargets);
        if (target) {
            worker.goRepair(target);
            return true;
        }
        return false;
    }

    private fortifyActions(worker: Creep, targets: (StructureWall | StructureRampart)[]): boolean {
        if (targets.length == 0 || this.capital.level < 4) {
            return false
        }
        let lowTargets: (StructureWall | StructureRampart)[];
        let lowestHits = _.min(_.map(targets, r => r.hits));

        lowTargets = _.take(_.filter(targets, r => r.hits <= lowestHits + this.tolerance), 5);
        let target = worker.pos.findClosestByMultiRoomRange(lowTargets);
        if (target) {
            worker.goRepair(target);
            return true
        }
        return false

    }

    private upgradeActions(worker: Creep): boolean {
        let target = this.capital.controller
        if (!(this.capital.controller.sign?.text == config.signature)) {
            worker.goSign(this.capital.controller)
            return true;
        } else {
            worker.goUpgrade(target)
            return true
        }

    }

    private handleWorker(worker: Creep): void {
        if (worker.store.energy > 0) {

            if(this.capital.controller.ticksToDowngrade <= (this.capital.level >= 4 ? 8000 : 0)) {
                if (this.upgradeActions(worker)) {
                    worker.say("⚡")
                    return;
                }
            }

            if (this.deconstructTargets.length > 0) {
				if (this.deconstructActions(worker)) {
                    worker.say("🔨")
                    return;
                }
			}

            if (this.repair && this.repairTargets.length > 0) {
				if (this.repairActions(worker)) {
                    worker.say("🛠️")
                    this.repair = false
                    return;
                }
			}
			// Fortify critical barriers
			if (this.criticalTargets.length > 0) {
				if (this.fortifyActions(worker, this.criticalTargets)) {
                    worker.say("🏛️")
                    return;
                }
			}
			// Build new structures
			if (this.constructionSites.length > 0) {
				if (this.buildActions(worker)) {
                    worker.say("☭")
                    return;
                }
			}
            if (this.fortifyTargets.length > 0) {
				if (this.fortifyActions(worker, this.fortifyTargets)) {
                    worker.say("🏛️")
                    return;
                }
			}
            if (this.capital.level < 8 || this.capital.creepsByRole[Roles.upgrader].length == 0) {
                if (this.upgradeActions(worker)) {
                    worker.say("⚡")
                    return;
                }
            }
            worker.say("BORED!")
        } else {
            if (this.deconstructTargets.length > 0) {
				if (this.deconstructActions(worker)) {
                    worker.say("Deconstructing!")
                    return;
                }
			}
            const drops = _.filter(this.room.droppedEnergy, r => r.amount >= worker.store.getCapacity()/2)
            const structs = _.filter(_.compact([this.capital.storage, this.capital.terminal, ...this.capital.containers]), r => r!.store[RESOURCE_ENERGY] && r!.store[RESOURCE_ENERGY] >= worker.store.getCapacity()) as (StructureStorage | StructureTerminal | StructureContainer)[]
            const tombs = _.filter(this.capital.room.tombstones, r => r.store.energy > worker.store.getCapacity()/4)
            let targets: (Resource | StructureStorage | StructureTerminal | StructureContainer | Tombstone)[] = []
            targets = targets.concat(...drops,...structs,...tombs)
            //console.log(JSON.stringify(this.room.drops))
            const target = worker.pos.findClosestByPath(targets)
            if(target) {
                worker.goWithdraw(target)
            } else {
                worker.say("No target")
            }
        }
    }

    init(): void {
        let currentParts = this.setup.getBodyPotential(WORK, this.capital);
        let numWorkers = 0;

        if (this.capital.stage == CapitalSize.Town) {
            let MAX_WORKERS = 5;
            let energyMinedPerTick = _.sum(_.map(this.capital.miningSites, r => _.sum(r.manager.miners, t => t.getActiveBodyparts(WORK) * HARVEST_POWER)))
            numWorkers = Math.ceil(energyMinedPerTick / currentParts / 1.1)
            numWorkers = Math.min(MAX_WORKERS, numWorkers)
        } else {
            let MAX_WORKERS = 10
            let repairTicks = _.sum(this.repairTargets, r => r.hitsMax - r.hits) / REPAIR_POWER;
            let buildTicks = _.sum(this.constructionSites, r => (r.progressTotal - r.progress) / BUILD_POWER)
            let fortifyTicks = 0;
            if ((this.capital.storage?.store.energy || 0) + _.sum(this.capital.containers, r => r.store.energy) >= this.fortifyThreshold) {
                fortifyTicks = _.sum(this.fortifyTargets, r => Math.max(0, this.hitsGoal - r.hits));
            }
            numWorkers = Math.ceil(2 * (5 * buildTicks + repairTicks + fortifyTicks) / Math.ceil(currentParts * CREEP_LIFE_TIME))
            numWorkers = Math.min(numWorkers, MAX_WORKERS, Math.ceil(this.capital.assets[RESOURCE_ENERGY] / 20000))
        }

        console.log(this.room.name, "Num workers wanted: ", numWorkers)
        this.spawnList(numWorkers, this.setup)
    }

    run(): void {
        let repair = true
        _.forEach(this.workers, r => this.handleWorker(r));
    }

}
