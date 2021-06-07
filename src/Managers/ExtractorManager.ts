import { ExtractorSite } from "Buildings/ExtractorSite";
import { MiningSite } from "Buildings/MiningSite";
import { bodyCost, CreepSetup } from "Creep_Setups/CreepSetup";
import { Roles, Setups } from "Creep_Setups/Setups";
import { Manager } from "Manager";
import { maxBy } from "Rando_Functions";
import { ManagerPriority } from "./ManagerPriority";

export const MINER_COST = bodyCost(Setups.drones.miners.standard.generateBody(Infinity));

export const DOUBLE_COST = bodyCost(Setups.drones.miners.double.generateBody(Infinity));

export class ExtractorManager extends Manager {
    site: ExtractorSite;
    miners: Creep[];
    constructionSite: ConstructionSite | undefined;
    harvestPos: RoomPosition | undefined; //Use for when we only need 1 spot
    mineral: Mineral
    extractor: StructureExtractor | undefined
    container: StructureContainer | undefined;
    link: StructureLink | undefined;
    energyPerTick: number;
    pos: RoomPosition
    room: Room

    constructor(extractorSite: ExtractorSite, priority = ManagerPriority.Capital.miner) {
        super(extractorSite, "ExtractorManager_" + extractorSite.mineral.id, priority);
        this.pos = extractorSite.pos
        this.room = extractorSite.room
        this.site = extractorSite;
        this.container = this.site.container;
        this.link = this.site.link || undefined;
        this.miners = this.creepsByRole[Roles.drone];
        this.mineral = this.site.mineral
        this.extractor = this.site.extractor
        this.constructionSite = _.first(this.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 2));

        this.energyPerTick = Math.max(_.sum(this.miners, r => r.getActiveBodyparts(WORK) * 2), Math.ceil((this.container?.store.getUsedCapacity() || 0) / 500))



        if (this.container) {
            this.harvestPos = this.container.pos;
        }
    }



    //calculates where the container should be put. If no barracks, just return the source position for miners to move to
    calculateContainerPos(): RoomPosition {
        if (this.capital.barracks) {
            let pathSearch = PathFinder.search(this.capital.coreSpawn!.pos, this.site.mineral.pos);
            return _.last(pathSearch.path);
        } else {
            return _.first(this.site.mineral.pos.getAdjacentPositions());
        }
    }

    private addContainer(): void {
        if (!this.container && !this.constructionSite && this.capital.level >= 6) {
            let res = this.calculateContainerPos().createConstructionSite(STRUCTURE_CONTAINER)

            if (res != OK) {
                console.log("No container could be built at " + JSON.stringify(this.calculateContainerPos()))
            }
        }
    }

    private addExtractor(): void {
        console.log("Checking for extractor position")
        if (!this.extractor && !this.constructionSite) {
            let res = this.pos.createConstructionSite(STRUCTURE_EXTRACTOR)

            if (res != OK) {
                console.log("No extractor could be built at " + JSON.stringify(this.pos))
            }
        }
    }

    private handleMiner(miner: Creep) {
        if (this.mineral.mineralAmount > 0) {
            if (this.harvestPos && this.container && this.container.store.getFreeCapacity() > 100) {
                miner.goHarvest(this.mineral)
            } else {
                miner.travelTo(this.mineral.pos)
            }
        } else {
            let spawn = miner.pos.findClosestByMultiRoomRange(this.capital.spawns);
            if (spawn && miner.pos.getMultiRoomRangeTo(spawn.pos) > 1) {
                miner.travelTo(spawn)
            } else if (spawn) {
                spawn.recycleCreep(miner)
            } else {
                miner.suicide()
            }
        }
    }

    init() {
        let setup = Setups.drones.extractor
        if (this.container && this.extractor && this.room.hostiles.length == 0 && this.mineral.mineralAmount > 0) {
		    this.spawnList(1, setup);
        }
	}

    run() {
        //console.log(JSON.stringify(this.miners))
        _.forEach(this.miners, r => this.handleMiner(r));
        if (this.room && Game.time % 20 == 0) {
            this.addContainer();
            this.addExtractor();
        }

        //console.log(this.mode)
        //console.log(JSON.stringify(this.container!.pos))


    }
}
