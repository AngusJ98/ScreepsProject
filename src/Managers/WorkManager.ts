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
        8       : 2e+7,
    };
    hitsGoal: number;
    critical = 2500;
    tolerance = 100000;
    fortifyThreshold = 500000;

    constructor(capital: Capital, prio = ManagerPriority.Capital.work) {
        super(capital, "WorkManager_" + capital.name, prio)
        this.workers = this.creepsByRole[Roles.worker];
        this.setup = this.capital.level == 1 ? Setups.workers.early : Setups.workers.default;
        this.room = capital.room
        this.hitsGoal = this.barrierHits[this.capital.level]
        this.fortifyTargets = _.filter(this.room.barriers, r => r.hits < this.hitsGoal);
        this.criticalTargets = _.filter(this.fortifyTargets, r => r.hits < this.critical);
        this.repairTargets = _.filter(this.capital.repairables);
        this.constructionSites = this.capital.constructionSites;
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
        if (targets.length == 0) {
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
            if(this.capital.controller.ticksToDowngrade <= (this.capital.level >= 4 ? 8000 : 2000)) {
                if (this.upgradeActions(worker)) return;
            }
            if (this.repairTargets.length > 0) {
				if (this.repairActions(worker)) return;
			}
			// Fortify critical barriers
			if (this.criticalTargets.length > 0) {
				if (this.fortifyActions(worker, this.criticalTargets)) return;
			}
			// Build new structures
			if (this.constructionSites.length > 0) {
				if (this.buildActions(worker)) return;
			}
            if (this.fortifyTargets.length > 0) {
				if (this.fortifyActions(worker, this.fortifyTargets)) return;
			}
            if (this.capital.level < 8 || this.capital.creepsByRole[Roles.upgrader].length == 0) {
                if (this.upgradeActions(worker)) return;
            }
            worker.say("BORED!")
        } else {
            let target = worker.pos.findClosestByRange(_.filter(this.capital.room.storageUnits, r => r.store.energy > worker.store.getCapacity()/4));
            if(target) {
                worker.goWithdraw(target)
            }
        }
    }

    init(): void {
        let currentParts = this.setup.getBodyPotential(WORK, this.capital);
        let numWorkers = 0;
        if (this.capital.stage = CapitalSize.Town) {
            let MAX_WORKERS = 10;
            numWorkers = 3;
        } else {
            let MAX_WORKERS = 5
            let repairTicks = _.sum(this.repairTargets, r => r.hitsMax - r.hits) / REPAIR_POWER;
            let buildTicks = _.sum(this.constructionSites, r => (r.progressTotal - r.progress) / BUILD_POWER)
            let fortifyTicks = 0;
            if ((this.capital.storage?.store.energy || 0) + _.sum(this.capital.containers, r => r.store.energy) >= this.fortifyThreshold) {
                fortifyTicks = 0.2 * _.sum(this.fortifyTargets, r => Math.max(0, this.hitsGoal - r.hits)); //take a fraction of how many barriers need fortifying
            }
            numWorkers = Math.ceil(2 * (5 * buildTicks + repairTicks + fortifyTicks) / currentParts * CREEP_LIFE_TIME)
            numWorkers = Math.min(numWorkers, MAX_WORKERS)
        }

        this.spawnList(numWorkers, this.setup)
    }

    run(): void {
        _.forEach(this.workers, r => this.handleWorker(r));
    }

}
