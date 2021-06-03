import { CreepSetup } from "Creep_Setups/CreepSetup";
import { Roles, Setups } from "Creep_Setups/Setups";
import { Manager } from "Manager";
import { ManagerPriority } from "Managers/ManagerPriority";
import { config } from "config";
import { SettleMission } from "./SettleMission";
import { Capital } from "Room/Capital";
import { SetupMission } from "./SetupMission";

export class SetupManager extends Manager {

    pioneers: Creep[];
    setup: CreepSetup;
    room: Room;
    mission: SetupMission;
    repairTargets: Structure[];
    constructionSites: ConstructionSite[];
    deconstructTargets: Structure[];
    fortifyTargets: (StructureWall | StructureRampart)[];
    criticalTargets: (StructureWall | StructureRampart)[];
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
    fortifyThreshold = 500000;

    constructor(mission: SettleMission, prio = ManagerPriority.Colonization.pioneer) {
        super(mission.capital!, "SetupManager_" + mission.name, prio)
        this.mission = mission
        this.pioneers = this.creepsByRole[Roles.colonist] || []
        this.setup = Setups.colonist
        this.room = mission.room
        this.hitsGoal = this.barrierHits[this.capital.level]
        this.fortifyTargets = [];
        this.criticalTargets = _.filter(this.fortifyTargets, r => r.hits < this.critical);
        this.repairTargets = _.filter(_.compact(this.room.repairables), r => r.hits < 0.8 * r.hitsMax);
        this.constructionSites = this.room.constructionSites;
        this.deconstructTargets = this.room.find(FIND_HOSTILE_STRUCTURES)
    }



    private handlePioneer(pioneer: Creep) {
        if (pioneer.room != this.mission.flag.room) {
            pioneer.travelTo(this.mission.flag)

            return
        }

        let source = pioneer.pos.findClosestByPath(_.filter(this.room.sources, r => r.energy > 0))
        let distance =source ? pioneer.pos.getMultiRoomRangeTo(source!.pos) : Infinity
        if (this.deconstructTargets.length > 0) {
            if (this.deconstructActions(pioneer)) {
                pioneer.say("Deconstructing!")
                return;
            }
        }

        let drops = _.filter(pioneer.room.droppedEnergy, r => r.amount >= pioneer.store.getCapacity()/4)
        let structs = _.filter(pioneer.room.storageUnits, r => r.store.energy >= pioneer.store.getCapacity()/4)
        let targets = _.merge(drops,structs)
        //console.log(JSON.stringify(this.room.drops))
        let target = pioneer.pos.findClosestByMultiRoomRange(targets);
        if(target && pioneer.store.getUsedCapacity() == 0) {
            pioneer.goWithdraw(target)
        } else {
            if (distance <= 1 && pioneer.store.getFreeCapacity() > 0) {
                pioneer.say("I mine")
                pioneer.goHarvest(source!)
            } else if (pioneer.store.getUsedCapacity() == 0) {
                pioneer.say("I go")
                pioneer.goHarvest(source!)
            } else {
                this.workActions(pioneer)
            }
        }
    }

    private workActions(pioneer: Creep) {
        if(this.capital.controller.ticksToDowngrade <= (this.capital.level >= 4 ? 8000 : 2000)) {
            if (this.upgradeActions(pioneer)) {
                pioneer.say("Upgrading!")
                return;
            }
        }


        // Fortify critical barriers
        if (this.criticalTargets.length > 0) {
            if (this.fortifyActions(pioneer, this.criticalTargets)) {
                pioneer.say("Fortifying!")
                return;
            }
        }
        // Build new structures
        if (this.constructionSites.length > 0) {
            if (this.buildActions(pioneer)) {
                pioneer.say("Building!")
                return;
            }
        }
        if (this.fortifyTargets.length > 0) {
            if (this.fortifyActions(pioneer, this.fortifyTargets)) {
                pioneer.say("Fortifying!")
                return;
            }
        }

        if (this.repairTargets.length > 0) {
            if (this.repairActions(pioneer)) {
                pioneer.say("Repairing!")
                return;
            }
        }
        else {
            if (this.upgradeActions(pioneer)) {
                pioneer.say("Upgrading!")
                return;
            }
        }
    }

    private buildActions(worker: Creep): boolean {
        let target = worker.pos.findClosestByMultiRoomRange(this.constructionSites);
        if (target) {
            worker.goBuild(target);
            return true;
        }
        return false;
    }

    private deconstructActions(worker: Creep): boolean {
        let target = worker.pos.findClosestByMultiRoomRange(this.deconstructTargets)
        if (target) {
            worker.goDeconstruct(target);
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
        let target = worker.pos.findClosestByPath(lowTargets);
        if (target) {
            worker.goRepair(target);
            return true
        }
        return false

    }

    private upgradeActions(worker: Creep): boolean {
        let target = worker.room.controller
        if (!(worker.room.controller!.sign?.text == config.signature)) {
            worker.goSign(worker.room.controller!)
            return true;
        } else {
            worker.goUpgrade(target!)
            return true
        }

    }

    init() {
        console.log(this.name, "REQUESTING SETUP CREEPS FROM ", this.capital.name, "current: ", this.pioneers.length)
        this.spawnList(2, this.setup)
    }

    run() {
        _.forEach(this.pioneers, r => this.handlePioneer(r))
    }
}
