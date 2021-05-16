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
	private productionQueue: {[priority: number]: SpawnOrder[]}; // Prioritized queue of spawning orders

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

    //TODO MAKE A PROPER IDLE SPOT. HIGH PRIO
    get idlePos(): RoomPosition {
        return this.spawns[0].pos.getAdjacentPositions()[0]
    }

    private generateCreepName(roleName: string): string {
        // Generate a creep name based on the role and add a hex id to make it unique
		let i = generateCreepID();
		while (Game.creeps[(roleName + '_' + i)]) {
			i = generateCreepID();
		}
		return (roleName + '_' + i);
    };

}

function generateCreepID() {
    const hex = '0123456789ABCDEF';
    let creepID = '';
    for (let i = 0; i < 4; i++) {
        creepID += hex.charAt(Math.floor(Math.random() * hex.length));
    }
    return creepID
}
