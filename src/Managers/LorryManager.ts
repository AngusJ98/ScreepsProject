import { Barracks } from "Buildings/Barracks";
import { LorryHQ } from "Buildings/LorryHQ";
import { Roles, Setups } from "Creep_Setups/Setups";
import { Manager } from "Manager";
import { maxBy } from "Rando_Functions";
import { ManagerPriority } from "./ManagerPriority";

/**
 * This manager handles long range hauls for the capital. For intercapital trading, use a mission instead
 * This also moves energy from containers in reserved rooms
 *
 * No cool logistics system like ovemind, yet! TODO
 */

export class LorryManager extends Manager{
    lorrys: Creep[];
    lorryHQ: LorryHQ;
    withdraw: ( StructureContainer | Resource)[];
    transfers: (StructureStorage | StructureTerminal | StructureContainer)[];
    currentTargeted: (StructureContainer | Resource)[];
    filteredTargets: (StructureContainer | Resource)[];

    constructor(hq: LorryHQ, prio = ManagerPriority.Lorry.lorry) {
        super(hq, "LorryManager" + hq.storage.id, prio);
        this.lorryHQ = hq
        this.lorrys = this.creepsByRole[Roles.lorry] || [];
        this.withdraw = [..._.filter(this.room.containers, r => r.store.energy > 0), ..._.filter(this.room.droppedEnergy, r => r.amount > 100)];
        this.currentTargeted = _.filter(_.map(this.lorrys, r => r.memory.targetId ? Game.getObjectById(r.memory.targetId) : undefined), r => r instanceof StructureContainer || r instanceof Resource) as (StructureContainer | Resource)[]
        let filteredTargets: (StructureContainer | Resource)[] = this.currentTargeted.filter(function(item, pos) {
            return filteredTargets.lastIndexOf(item) == filteredTargets.indexOf(item);
          }); //removes elements that are already being served by 2+ lorry
        this.filteredTargets = filteredTargets

        this.transfers = _.filter(_.compact([this.capital.upgradeSite?.container!, this.capital.battery!, this.room.terminal!]), r => r.energy < r.energyCapacity);
        if (this.capital.battery) {
            _.remove(this.withdraw, this.capital.battery)
        }
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

    transportPowerNeeded(): number {
        let transportPower = 0;
        for (let site of this.capital.miningSites) {
            let manager = site.manager;
            if (manager.miners.length >= 0 && manager.isDropMining) {
                transportPower += manager.energyPerTick * 2 * PathFinder.search(site.pos, this.pos).path.length
            }
        }

        if (this.capital.upgradeSite && this.capital.upgradeSite.container) {
            transportPower += UPGRADE_CONTROLLER_POWER * this.capital.upgradeSite.manager.powerNeeded * PathFinder.search(this.capital.upgradeSite.container.pos, this.pos).path.length
        }

        return transportPower/2;
    }

    handleLorry(lorry: Creep) {
        if (lorry.memory.state == "transfer" && lorry.store.energy == 0) {
            lorry.memory.state = "withdraw"
            lorry.memory.targetId = undefined;
        } else if (lorry.memory.state == "withdraw" && lorry.store.getFreeCapacity() == 0) {
            lorry.memory.state = "transfer"
            lorry.memory.targetId = undefined;
        } else {
            lorry.memory.state = "withdraw"
            lorry.memory.targetId = undefined;
        }

        if (lorry.memory.state = "withdraw") {
            if (lorry.memory.targetId) {
                let target = Game.getObjectById(lorry.memory.targetId) as StructureContainer | Resource | undefined;
                if (target && this.getAmount(target) > 0) {
                    lorry.goWithdraw(target);
                    return
                }
            }

            let target = maxBy(this.filteredTargets, r => this.getAmount(r))
            if (target) {
                lorry.memory.targetId = target.id
                lorry.goWithdraw(target)
                return
            } else {
                target = maxBy(this.withdraw, r => this.getAmount(r))
                if (target) {
                    lorry.memory.targetId = target.id
                    lorry.goWithdraw(target)
                    return
                } else {
                    lorry.say("No target :c")
                    return
                }
            }
        } else {
            if (lorry.memory.targetId) {
                let target = Game.getObjectById(lorry.memory.targetId) as (StructureStorage | StructureTerminal | StructureContainer);
                if (target && this.getAmount(target) > 0) {
                    lorry.goTransfer(target);
                    return
                }
            }

            let target = _.first(_.filter(this.transfers, r => r.energy < 0.5 * r.store.getCapacity())) as (StructureStorage | StructureTerminal | StructureContainer);
                if (target) {
                lorry.memory.targetId = target.id
                lorry.goTransfer(target);
                return
            }
            target = _.first(_.filter(this.transfers, r => r.energy < 0.8 * r.store.getCapacity())) as (StructureStorage | StructureTerminal | StructureContainer);
                if (target) {
                lorry.memory.targetId = target.id
                lorry.goTransfer(target);
                return
            }
            target = _.first(this.transfers) as (StructureStorage | StructureTerminal | StructureContainer);
            lorry.memory.targetId = target.id
            lorry.goTransfer(this.lorryHQ.storage);
            return
        }
    }

    init(): void {
        let setup = Setups.lorrys.early
        let needed = this.transportPowerNeeded()
        let powerEach = setup.getBodyPotential(CARRY, this.capital)
        let lorrysNeeded = Math.ceil(needed/powerEach)

        if (this.lorrys.length == 0) {
            this.spawnList(lorrysNeeded, setup, {priority: ManagerPriority.Capital.firstTransport})
        } else {
            this.spawnList(lorrysNeeded, setup)
        }
    }

    run(): void {
        _.forEach(this.lorrys, r => this.handleLorry(r));
    }
}
