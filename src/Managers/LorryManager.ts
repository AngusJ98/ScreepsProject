import { Barracks } from "Buildings/Barracks";
import { LorryHQ } from "Buildings/LorryHQ";
import { Roles, Setups } from "Creep_Setups/Setups";
import { Manager } from "Manager";
import { ManagerPriority } from "./ManagerPriority";

/**
 * This manager handles long range hauls for the capital. For intercapital trading, use a mission instead
 * This also moves energy from containers in reserved rooms
 */

export class LorryManager extends Manager{
    lorrys: Creep[];
    lorryHQ: LorryHQ;
    withdraw: ( StructureContainer | Resource)[];
    targets: (StructureStorage | StructureTerminal | StructureContainer)[];

    constructor(hq: LorryHQ, prio = ManagerPriority.Lorry.lorry) {
        super(hq, "LorryManager" + hq.storage.id, prio);
        this.lorryHQ = hq
        this.lorrys = this.creepsByRole[Roles.lorry]
        this.withdraw = [..._.filter(this.room.containers, r => r.store.energy > 0), ..._.filter(this.room.droppedEnergy, r => r.amount > 100)];
        this.targets = _.filter(_.compact([this.room.storage!, this.room.terminal!, this.capital.battery!]), r => r.energy < r.energyCapacity);
        if (this.capital.battery) {
            _.remove(this.withdraw, this.capital.battery)
        }
    }

    getAmount(ori: StructureContainer | Resource): number {
        if (ori instanceof StructureContainer) {
            return ori.store.energy
        } else {
            return ori.amount
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

    }
}
