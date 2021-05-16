import { Capital } from "Room/Capital";
import { Building } from "./Building";

export class Barracks extends Building {
    spawns: StructureSpawn[]
    coreSpawn: StructureSpawn;
    availableSpawns: StructureSpawn[];
    extensions: StructureExtension[];
    energyStructures: (StructureSpawn | StructureExtension)[];
    name: string;

    private productionPriorities: number[];
	private productionQueue: {[priority: number]: SpawnOrder[]}; // Prioritized spawning queue

    constructor(capital: Capital, mainSpawn: StructureSpawn) {
        super(capital, mainSpawn)
        this.name = "Barracks_" + mainSpawn.id

        this.spawns = this.capital.spawns
        this.coreSpawn = this.capital.coreSpawn!
        this.availableSpawns = _.filter(this.spawns, r => !r.spawning);
        this.extensions = capital.extensions;
        this.energyStructures = _.sortBy((<(StructureSpawn | StructureExtension)[]>[]).concat(this.spawns, this.extensions), r => r.pos.getRangeTo(this.idlePos))

        this.productionPriorities = [];
		this.productionQueue = {};
        this.manager = new QueenManager(this)
    }

    get idlePos(): RoomPosition {
        return this.spawns[0].pos.getAdjacentPositions()[0]
    }

}
