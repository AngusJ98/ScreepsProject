import { Barracks } from "Buildings/Barracks";
import { MiningSite } from "Buildings/MiningSite";
import { Roles, Setups } from "Creep_Setups/Setups";
import { Manager } from "Manager";
import { config } from "config";
import { CapitalSize } from "Room/Capital";
import { ManagerPriority } from "./ManagerPriority";


//Used to manage rooms that are just starting out. Uses miniminers and minilorrys to build stuffs

export class CrisisManager extends Manager{
    lorrys: Creep[];
    withdraw: (StructureStorage | StructureTerminal | StructureContainer | StructureLink | StructureTower)[];
    targets: (StructureSpawn | StructureExtension)[];

    constructor(barracks: Barracks, prio = ManagerPriority.Crisis.mini) {
        super(barracks, "CrisisManager_" + barracks.coreSpawn.id, prio);
        this.lorrys = this.creepsByRole[Roles.lorry]
        this.withdraw = _.filter(_.compact([this.room.storage!, this.room.terminal!, ...this.room.containers, ...this.room.links]), r => r.store.energy > 0);
        this.targets = _.filter([...this.room.spawns, ...this.room.extensions], r => r.energy < r.energyCapacity);
    }

    private spawnMiners() {
        let miningSites: MiningSite[] = _.filter(this.capital.miningSites, r => r.room == this.room) //only spawn miners for sources in the room
        if (this.capital.spawns[0]) {
			miningSites = _.sortBy(miningSites, site => site.pos.getRangeTo(this.capital.spawns[0])); //If we have a spawn, check the closest source first!
		}

        //for ease, we spawn high priority miners and palm them off to the mining managers
        let miningManagers = _.map(miningSites, r => r.manager) //get a list of managers

        for (let mineManager of miningManagers) {
            let currentMiners = this.filterLife(mineManager.miners)
            let partsNeeded = Math.ceil(SOURCE_ENERGY_CAPACITY / ENERGY_REGEN_TIME / HARVEST_POWER) + 1;
            let partsAssigned = _.sum(_.map(currentMiners, r => r.getActiveBodyparts(WORK)));
            if (partsAssigned < partsNeeded && currentMiners.length < mineManager.pos.getAdjacentPositions().length) {
                this.capital.barracks!.addToQueue(Setups.drones.miners.emergency, mineManager, {priority: this.priority})
            }
        }
    }

    init() {
        //spawn early miners if this is early capital and has none. return statement so no other higher prio
        //creeps are spawned
        if(this.capital.stage == CapitalSize.Town) {
            if (!this.capital.creepsByRole[Roles.drone] || this.capital.creepsByRole[Roles.drone].length == 0) {
                this.spawnMiners();
                return
            }
        }

        //spawn a transport and reassign as queen if no queen
        if (this.capital.creepsByRole[Roles.queen].length == 0) {
            let lorry = this.capital.creepsByRole[Roles.lorry]
            if (lorry[0]) {
                lorry[0].reassign(Roles.queen, this.capital.barracks!.manager)
            } else {
                this.spawnList(1, Setups.lorry)
            }
        }

        //then! Spawn the rest of the miners needed if we don't have enough energy in room
        let roomEnergy: number = this.room.energyAvailable + _.sum(this.withdraw, r => r.store.energy || r.energy);
        let dropped = _.sum(this.room.droppedEnergy, r => r.amount);
        if (roomEnergy + dropped < config.crisis.emergencyMinersEnergyLimit) {
            this.spawnMiners()
        }
    }

    run() {
        if (this.creeps.length > 0) {
            console.log("Crisis manager has creeps?! How?")
        }
    }
}
