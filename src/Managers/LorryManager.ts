import { Barracks } from "Buildings/Barracks";
import { ExtractorSite } from "Buildings/ExtractorSite";
import { LorryHQ } from "Buildings/LorryHQ";
import { MiningSite } from "Buildings/MiningSite";
import { UpgradeSite } from "Buildings/UpgradeSite";
import { CreepSetup } from "Creep_Setups/CreepSetup";
import { Roles, Setups } from "Creep_Setups/Setups";
import { Manager } from "Manager";
import { maxBy } from "Rando_Functions";
import { ManagerPriority } from "./ManagerPriority";

/**
 * This manager handles long range hauls for the capital. For intercapital trading, use a mission instead
 * This also moves energy between containers and the storage in reserved rooms
 *
 * Damn after 30 minutes thinking in the shower, this code is so much nicer wtf was I thinking before
 *
 */

export class LorryManager extends Manager{
    lorrys: Creep[];
    lorryHQ: LorryHQ;
    bunkerStorage: StructureStorage | StructureTerminal | StructureContainer
    setup: CreepSetup;
    powerPer: number;
    sites: (MiningSite|UpgradeSite|ExtractorSite)[]

    constructor(hq: LorryHQ, prio = ManagerPriority.Lorry.lorry) {
        super(hq, "LorryManager" + hq.storage.id, prio);
        this.lorryHQ = hq
        this.lorrys = this.creepsByRole[Roles.lorry] || [];
        this.bunkerStorage = this.lorryHQ.storage;
        this.setup = Setups.lorrys.early
        this.powerPer = this.setup.getBodyPotential(CARRY, this.capital);
        this.sites = []
        this.sites = this.sites.concat(this.capital.miningSites)
        this.sites = this.sites.concat(this.capital.upgradeSite!)
        this.sites = _.compact(this.sites)
    }

    grabInputs() {
        let inputsList: (StructureStorage | StructureTerminal | StructureContainer | undefined)[] = [];
        _.forEach(this.capital.miningSites, r => inputsList.push(r.container))
        let newList: (StructureStorage | StructureTerminal | StructureContainer)[] = _.compact(inputsList) as (StructureStorage | StructureTerminal | StructureContainer)[];

        return _.sortBy(newList, r => this.getAmount(r!))
    }

    grabOutputs() {
        let outputsList: (StructureContainer | StructureStorage | undefined)[] = [];
        outputsList.push(this.capital.upgradeSite!.container)
        let newList: (StructureStorage | StructureTerminal | StructureContainer)[] = _.compact(outputsList) as (StructureContainer | StructureTerminal | StructureStorage)[]
        return _.filter(newList, r => r!.energy < r!.energyCapacity)
    }

    getAmount(ori: Structure | Resource): number {
        if (ori instanceof StructureContainer) {
            return ori.store.energy
        } else if (ori instanceof Resource) {
            return ori.amount
        } else {
            return 0
        }
    }

    transporterSizePerSite(site: MiningSite | UpgradeSite | ExtractorSite) {
        if (site instanceof UpgradeSite) {
            return Math.ceil(UPGRADE_CONTROLLER_POWER * site.manager.powerNeeded * 2 * PathFinder.search(this.lorryHQ.pos, site.pos).cost / CARRY_CAPACITY);
        } else {
            return Math.ceil(site.manager.energyPerTick * 2 * PathFinder.search(this.lorryHQ.pos, site.pos).cost / CARRY_CAPACITY);
        }
    }

    handleLorry(lorry: Creep) {
        switch(lorry.memory.state!) {
            case "withdraw":
                let target = Game.getObjectById(lorry.memory.targetId!) as StructureContainer | Resource;
                let type: ResourceConstant = target instanceof StructureContainer? _.first(_.keys(target.store)) as ResourceConstant : RESOURCE_ENERGY;
                if (target && lorry.store.getFreeCapacity() > 0) {
                    lorry.goWithdraw(target, type);
                } else if (target){
                    lorry.goTransfer(this.bunkerStorage, type);
                } else {
                    this.noTargetActions(lorry)
                }
                return;
            case "transfer":
                let transTarget = Game.getObjectById(lorry.memory.targetId!) as StructureContainer | StructureStorage;
                if (lorry.store.getFreeCapacity() == 0 && transTarget) {
                    lorry.goTransfer(transTarget);
                } else if (transTarget) {
                    lorry.goWithdraw(this.bunkerStorage);
                } else {
                    this.noTargetActions(lorry)
                }
                return;
            default:
                lorry.say("No state, suiciding")
                lorry.suicide()
                return;

        }
    }

    noTargetActions(lorry: Creep) {
        if (lorry.store.getUsedCapacity() == 0) {
            let drop = lorry.pos.findClosestByMultiRoomRange(this.room.allDrops)
            if (drop) {
                lorry.goWithdraw(drop)
            } else {
                lorry.say("No target and no drops, suiciding")
                lorry.suicide()
            }
        } else {
            lorry.goTransfer(this.bunkerStorage)
        }
    }

    init(): void {
        for (let site of this.sites) {
            if (site.container && site.room.hostiles.length == 0) {

                let targetTotal = this.transporterSizePerSite(site)
                console.log(site.container.id, " needs ", targetTotal)
                let current = this.filterLife(_.filter(this.lorrys, r => r.memory.targetId == site.container!.id))
                let currentSize = _.sum(current, r => r.getActiveBodyparts(CARRY))
                let maxSize = this.powerPer
                if (targetTotal > currentSize) {
                    let numNeeded = 1
                    let state: "withdraw" | "transfer" | undefined = site instanceof MiningSite ? "withdraw" : "transfer";
                    let sizeNeeded = targetTotal;
                    if (maxSize > targetTotal) {
                        numNeeded = Math.ceil(targetTotal / maxSize)
                        sizeNeeded = Math.ceil(targetTotal/numNeeded);
                    }
                    console.log("Size Requested", sizeNeeded)
                    let setup = new CreepSetup(Roles.lorry, {pattern  : [CARRY, MOVE], sizeLimit: sizeNeeded,})
                    this.capital.barracks?.addToQueue(setup, this, {priority: ManagerPriority.Lorry.lorry, targetId: site.container?.id, state: state})
                    /*
                    let size = Math.min(targetTotal - currentSize, maxSize);
                    let state: "withdraw" | "transfer" | undefined = site instanceof MiningSite ? "withdraw" : "transfer";
                    let setup = new CreepSetup(Roles.lorry, {pattern  : [CARRY, MOVE], sizeLimit: size,})
                    this.capital.barracks?.addToQueue(setup, this, {priority: ManagerPriority.Lorry.lorry, targetId: site.container?.id, state: state})
                    */
                }
            } else {
                //console.log("no container at site")
            }

        }
        let dropAmount = _.sum(this.room.droppedEnergy, r => r.amount)
        if (dropAmount >= 200) {
            let current = _.filter(this.lorrys, r => r.memory.targetId == undefined).length
            if (current == 0) {
                let setup = new CreepSetup(Roles.lorry, {pattern  : [CARRY, MOVE], sizeLimit: Math.floor(dropAmount/CARRY_CAPACITY/8)})
                this.capital.barracks?.addToQueue(setup, this, {priority: ManagerPriority.Lorry.lorry, targetId: undefined, state: "withdraw"})
            }
        }


    }

    run(): void {
        _.forEach(this.lorrys, r => this.handleLorry(r));
    }
}
