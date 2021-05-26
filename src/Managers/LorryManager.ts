import { Barracks } from "Buildings/Barracks";
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
 * Look at lorrymanagerdeprecated for how bad the code was before, jesus
 *
 * It's pretty bad now, but at least it works
 *
 */

export class LorryManager extends Manager{
    lorrys: Creep[];
    lorryHQ: LorryHQ;
    inputs: ( StructureStorage | StructureTerminal | StructureContainer)[];
    outputs: (StructureStorage | StructureTerminal | StructureContainer)[];
    both: (StructureStorage | StructureTerminal | StructureContainer)[];
    bunkerStorage: StructureStorage | StructureTerminal | StructureContainer
    setup: CreepSetup;
    powerPer: number;
    sites: (MiningSite|UpgradeSite)[]
    availableTargets: (MiningSite|UpgradeSite)[]

    constructor(hq: LorryHQ, prio = ManagerPriority.Lorry.lorry) {
        super(hq, "LorryManager" + hq.storage.id, prio);
        this.lorryHQ = hq
        this.lorrys = this.creepsByRole[Roles.lorry] || [];
        this.inputs = this.grabInputs();
        this.outputs = this.grabOutputs();
        this.both = this.inputs.concat(this.outputs)
        this.bunkerStorage = this.lorryHQ.storage;
        this.setup = Setups.lorrys.early
        this.powerPer = this.setup.getBodyPotential(CARRY, this.capital) * CARRY_CAPACITY;
        this.sites = []
        this.sites = this.sites.concat(this.capital.miningSites)
        this.sites = this.sites.concat(this.capital.upgradeSite!)
        this.sites = _.compact(this.sites)
        this.availableTargets = []
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

    transportersPerSite(site: MiningSite | UpgradeSite) {
        if (site instanceof UpgradeSite) {
            return Math.ceil(UPGRADE_CONTROLLER_POWER * site.manager.powerNeeded * 2 * PathFinder.search(this.lorryHQ.pos, site.pos).path.length / this.powerPer);
        } else {
            return Math.ceil(site.manager.energyPerTick * 2 * PathFinder.search(this.lorryHQ.pos, site.pos).path.length / this.powerPer);
        }
    }

    transportersNeeded(): number {
        let needed = _.sum(this.sites, r => this.transportersPerSite(r))
        //console.log("Needed" + needed)
        return needed
    }

    handleLorry(lorry: Creep) {
        if(!lorry.memory.targetId && this.availableTargets.length > 0 && lorry.store.energy == 0) {
            let newTarget = this.availableTargets[0]
            lorry.memory.targetId = newTarget.container!.id;
            if (newTarget instanceof MiningSite) {
                lorry.memory.state = "withdraw"
            } else {
                lorry.memory.state = "transfer"
            }
            _.remove(this.availableTargets, r => r.container!.id == lorry.memory.targetId)
        }

        if (lorry.memory.state == "withdraw") {
            if (lorry.store.energy == 0 && lorry.memory.targetId) {
                let potentialTarget = this.capital.buildingsByContainer[lorry.memory.targetId]
                let target = potentialTarget.container? potentialTarget : undefined
                if(target) {
                    lorry.goWithdraw(target.container!)
                } else {
                    lorry.say("No container at target site :c")
                    lorry.memory.targetId = undefined
                }
            } else if (lorry.store.energy > 0) {
                lorry.goTransfer(this.bunkerStorage)
                lorry.memory.targetId = undefined;
            } else {
                let drop = lorry.pos.findClosestByRange(lorry.room.droppedEnergy)
                if (drop) {
                    lorry.goWithdraw(drop)
                }
            }
        } else if (lorry.memory.state = "transfer") {
            if (!lorry.memory.targetId) {
                lorry.memory.state = "withdraw"
            }

            if (lorry.store.energy == lorry.store.getCapacity() && lorry.memory.targetId) {
                let potentialTarget = this.capital.buildingsByContainer[lorry.memory.targetId]
                let target = potentialTarget.container? potentialTarget : undefined
                if(target) {
                    lorry.goTransfer(target.container!)
                } else {
                    lorry.say("No container at target site :c")
                    lorry.memory.targetId = undefined
                    return
                }

                if(lorry.pos.getRangeTo(target.container!.pos) <= 1) {
                    lorry.memory.targetId = undefined
                }
            } else {
                lorry.goWithdraw(this.bunkerStorage)
            }

        } else {
            lorry.goTransfer(this.bunkerStorage)
            lorry.memory.state = "withdraw"
        }
    }

    init(): void {
        let setup = Setups.lorrys.early
        let needed = this.transportersNeeded()

        if (this.lorrys.length == 0) {
            this.spawnList(needed, setup, {priority: ManagerPriority.Capital.firstTransport})
        } else {
            this.spawnList(needed, setup)
        }



    }

    run(): void {
        let targets = _.compact(_.map(this.lorrys, r => r.memory.targetId)) as string[];
        let targetSites = _.map(targets, r => this.capital.buildingsByContainer[r])

        for (let site of this.sites) {
            if (!site.container) {
                continue
            }
            let needed = this.transportersPerSite(site)
            let current = _.filter(targetSites, r => r == site).length
            if (current < needed) {
                this.availableTargets.push(site)
            }
        }
        _.remove(this.availableTargets, r => (r instanceof MiningSite && r.container!.store.getUsedCapacity() < this.powerPer) || (r instanceof UpgradeSite && r.container!.store.getFreeCapacity() < this.powerPer))
        _.forEach(this.lorrys, r => this.handleLorry(r));
    }
}
