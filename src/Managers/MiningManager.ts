import { MiningSite } from "Buildings/MiningSite";
import { bodyCost, CreepSetup } from "Creep_Setups/CreepSetup";
import { Roles, Setups } from "Creep_Setups/Setups";
import { Manager } from "Manager";
import { ManagerPriority } from "./ManagerPriority";

export const MINER_COST = bodyCost(Setups.drones.miners.standard.generateBody(Infinity));

export const DOUBLE_COST = bodyCost(Setups.drones.miners.double.generateBody(Infinity));

export class MiningManager extends Manager {
    site: MiningSite;
    miners: Creep[];
    constructionSite: ConstructionSite | undefined;
    harvestPos: RoomPosition | undefined; //Use for when we only need 1 spot
    miningPowerNeeded: number;
    minersNeeded: number;
    energyPerTick: number;
    dropMineUntilRCL = 3;
    setup: CreepSetup;
    mode: "Early" | "Standard" | "Link" | "Standard" | "Double" | "SK"
    isDropMining: boolean;

    container: StructureContainer | undefined;
    link: StructureLink | undefined;

    constructor(miningSite: MiningSite, priority = ManagerPriority.Capital.miner) {
        super(miningSite, "MineManager_" + miningSite.source.id, priority);
        this.site = miningSite;
        this.container = this.site.container;
        this.link = this.site.link;
        this.constructionSite = _.first(this.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 2));

        this.miners = this.creepsByRole[Roles.drone];
        if (this.room.controller && this.room.controller.my) {
            this.energyPerTick = SOURCE_ENERGY_CAPACITY / ENERGY_REGEN_TIME;
        } else {
            this.energyPerTick = SOURCE_ENERGY_NEUTRAL_CAPACITY / ENERGY_REGEN_TIME;
        }

        this.miningPowerNeeded = Math.ceil(this.energyPerTick / HARVEST_POWER) + 1;

        if(this.capital.room.energyCapacityAvailable < MINER_COST) {
            this.mode = "Early";
            this.setup = Setups.drones.miners.emergency;
        } else if (this.site.link) {
            this.mode = "Link";
            this.setup = Setups.drones.miners.default;
        } else {
            this.mode = "Standard";
            this.setup = Setups.drones.miners.default;
        } //TODO Add code for when we want double miners (saves cpu)

        this.minersNeeded = Math.min(this.pos.getAdjacentPositions().length, Math.ceil(this.miningPowerNeeded / (this.setup.getBodyPotential(WORK, this.capital))))

        this.isDropMining = this.capital.level < this.dropMineUntilRCL;

        if (this.mode != "Early" && !this.isDropMining) {
            if (this.container) {
                this.harvestPos = this.container.pos;
            } else if (this.link) {
                this.harvestPos = _.first(_.filter(this.pos.getAdjacentPositions(), r => r.getRangeTo(this.link!) == 1));
            } else {
                this.harvestPos = this.calculateContainerPos();
            }
        }
    }

    //calculates where the container should be put. If no barracks, just return the source position for miners to move to
    calculateContainerPos(): RoomPosition {
        if (this.capital.barracks) {
            let pathSearch = PathFinder.search(this.capital.coreSpawn!.pos, this.site.source.pos);
            return _.last(pathSearch.path);
        } else {
            return _.first(this.site.source.pos.getAdjacentPositions());
        }
    }

    private addContainer(): void {
        if (this.isDropMining) { //no container needed if we are still drop mining, not worth building one yet
            return
        }
        if (!this.container && !this.constructionSite) {

        }
    }

    private earlyMiner(miner: Creep): void {
        if (miner.room != this.room) {
			miner.travelTo(this.pos);
		}

        if (this.container) {
			if (this.container.hits < this.container.hitsMax && miner.carry.energy >= Math.min(miner.carryCapacity, REPAIR_POWER * miner.getActiveBodyparts(WORK))) {
				miner.goRepair(this.container);
            } else {
                if (miner.store.getFreeCapacity() > 0) {
                    miner.goHarvest(this.site.source)
                } else {
                    miner.goTransfer(this.container)
                }
            }
        }
    }

    private handleMiner(miner: Creep) {
        if (this.mode == "Early") {
            if (!miner.pos.inRangeTo(this.pos, 1)) {
                miner.moveTo(this.pos)
            }
        } else if (this.harvestPos) {
            if (!miner.pos.inRangeTo(this.pos, 1)) {
                miner.moveTo(this.harvestPos)
            }
        } else {
            console.log("No harvest spot? What went wrong")
        }

        switch (this.mode) {
            case "Early":
                return this.earlyMiner(miner);
            case "Link":
                return this.linkMiner(miner);
            case "Standard":
                return this.standardMiner(miner);
            case "SK":
                return this.standardMiner(miner);
            case "Double":
                return this.standardMiner(miner);
        }
    }

    init() {
		this.spawnList(this.minersNeeded, this.setup);
	}

    run() {
        for (let miner of this.miners) {
            this.handleMiner(miner);
        }
        if (this.room && Game.time % 20 == 0) {
            this.addContainer();
        }


    }
}
