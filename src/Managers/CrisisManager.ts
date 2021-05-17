import { Barracks, SpawnOrder } from "Buildings/Barracks";
import { MiningSite } from "Buildings/MiningSite";
import { Roles, Setups } from "Creep_Setups/Setups";
import { Manager } from "Manager";
import { ManagerPriority } from "./ManagerPriority";
import { MiningManager } from "./MiningManager";

//Used to manage rooms that are just starting out. Uses miniminers and minilorrys to build stuffs

export class CrisisManager extends Manager{
    lorrys: Creep[];
    withdraw: (StructureStorage | StructureTerminal | StructureContainer | StructureLink | StructureTower)[];
    targets: (StructureSpawn | StructureExtension)[];

    constructor(barracks: Barracks, prio = ManagerPriority.Crisis.mini) {
        super(barracks, "MiniManager", prio);
        this.lorrys = this.creepsByRole[Roles.lorry]
        this.withdraw = _.filter(_.compact([this.capital.storage!, this.capital.terminal!, ...this.capital.containers, ...this.capital.links, ...this.capital.towers ]))
        this.targets = _.filter([...this.capital.spawns, ...this.capital.extensions], r => r.energy < r.energyCapacity);
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
            let partsNeeded = SOURCE_ENERGY_CAPACITY / 300 / 2;
            let partsAssigned = _.sum(_.map(currentMiners, r => r.getActiveBodyparts(WORK)));
            if (partsAssigned < partsNeeded && currentMiners.length < mineManager.pos.getAdjacentPositions().length) {
                let request: SpawnOrder = this.capital.barracks!.createSpawnOrder(Setups.drones.miners.emergency, mineManager, {priority: this.priority})
                this.capital.barracks!.addToQueue(request)
            }
        }
    }

    init() {

    }
}
