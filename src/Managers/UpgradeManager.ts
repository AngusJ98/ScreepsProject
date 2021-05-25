import { UpgradeSite } from "Buildings/UpgradeSite";

import { Roles, Setups } from "Creep_Setups/Setups";
import { config } from "config";
import { Manager } from "Manager";
import { ManagerPriority } from "./ManagerPriority";

export class UpgradeManager extends Manager {
    controller: StructureController;
    upgraders: Creep[];
    upgradeSite: UpgradeSite
    room:Room;
    powerNeeded: number;

    constructor (upgradeSite:UpgradeSite, prio = ManagerPriority.Upgrading.upgrade) {
        super(upgradeSite, "UpgradeManager_" + upgradeSite.controller.id, prio);
        this.controller = upgradeSite.controller;
        this.upgraders = this.creepsByRole[Roles.upgrader]
        this.upgradeSite = upgradeSite
        this.room = upgradeSite.room
        this.powerNeeded = 0;

    }

    private handleUpgrader(upgrader: Creep) {
        if (upgrader.store.energy > 0) {
            if (this.upgradeSite.link && this.upgradeSite.link.hits < this.upgradeSite.link.hitsMax) {
                upgrader.goRepair(this.upgradeSite.link)
                return
            }
            if (this.upgradeSite.container && this.upgradeSite.container.hits < this.upgradeSite.container.hitsMax) {
                upgrader.goRepair(this.upgradeSite.container)
                return
            }
            if (this.upgradeSite.constructionSite) {
                upgrader.goBuild(this.upgradeSite.constructionSite)
                return
            }
            if (!(this.upgradeSite.controller.sign?.text == config.signature)) {
                upgrader.goSign(this.capital.controller)
                return;
            }
            upgrader.goUpgrade(this.upgradeSite.controller)
            return;
        } else {
            if (this.upgradeSite.link && this.upgradeSite.link.energy > 0) {
				upgrader.goWithdraw(this.upgradeSite.link);
			} else if (this.upgradeSite.container && this.upgradeSite.container.energy > 0) {
				upgrader.goWithdraw(this.upgradeSite.container);
			} else {
                let drops = _.filter(this.room.droppedEnergy, r => r.amount > upgrader.store.getCapacity()/4)
                let structs = _.filter(this.capital.room.storageUnits, r => r.store.energy > upgrader.store.getCapacity()/4)
                let targets = _.merge(drops,structs)
                //console.log(JSON.stringify(this.room.drops))
                let target = upgrader.pos.findClosestByRange(targets);
                if(target) {
                    upgrader.goWithdraw(target)
                }
            }
        }
    }


    init(): void {
		if (this.capital.level < 3 || !this.capital.storage) { // let workers upgrade early on until we have a storage
			return;
		}
        if (this.capital.assets[RESOURCE_ENERGY] > 100000 || this.controller.ticksToDowngrade < 500) {
            let setup = this.capital.level == 8 ? Setups.upgraders.rcl8 : Setups.upgraders.default
            if (this.capital.level == 8) {
				this.spawnList(1, setup);
			} else {
                let upgradePowerEach = setup.getBodyPotential(WORK, this.capital);
                let extra = Math.max(this.capital.assets[RESOURCE_ENERGY] - 80000, 0) // how much energy we have spare. 80k is cutoff point TODO add to config
                let upgradePartNeeded = Math.floor(extra / 10000)  //How many parts to spawn TODO add to config

                if (extra > 800000) {
					upgradePartNeeded *= 4; //MORE POWER if we have lots of energy lying around
				} else if (extra > 500000) {
					upgradePartNeeded *= 2;
				}
                this.powerNeeded = upgradePartNeeded;
				const upgradersNeeded = Math.ceil(upgradePartNeeded / upgradePowerEach );
				this.spawnList(upgradersNeeded, setup);
			}
        }
    }

    run(): void {
        _.forEach(this.upgraders, r => this.handleUpgrader(r));
    }
}
