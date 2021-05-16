import { bodyCost, CreepSetup } from "Creep_Setups/CreepSetup";
import { Manager } from "Manager";
import { Capital } from "Room/Capital";
import { Building } from "./Building";

interface SpawnOrder {
    body: BodyPartConstant[];
	name: string;
    memory: CreepMemory;
	options: SpawnRequestOptions,
}
export interface SpawnRequestOptions {
	spawn?: StructureSpawn;				// allows you to specify which spawn to use;
	directions?: DirectionConstant[];	// StructureSpawn.spawning.directions
    priority: number;                   // Priority of spawning, lower number = higher prio
    prespawn: number;                   // Spawn creep this many ticks early to prevent downtime
}

export class Barracks extends Building {
    spawns: StructureSpawn[]
    coreSpawn: StructureSpawn;
    availableSpawns: StructureSpawn[];
    extensions: StructureExtension[];
    energyStructures: (StructureSpawn | StructureExtension)[];
    name: string;

    private productionPriorities: number[]; // A list of priorities to check when spawning
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

    private createSpawnOrder(setup: CreepSetup, manager: Manager, opts: SpawnRequestOptions): SpawnOrder {
        let body: BodyPartConstant[] = setup.generateBody(this.room.energyCapacityAvailable)
        let memory: CreepMemory = {
            capital: manager.capital.name,
            manager: manager.name,
            role: setup.role,
            routing: null,
            task: null,
            recycle: false,
            killed: false,
            data: {},
        }
        let name = this.generateCreepName(setup.role)
        let order: SpawnOrder = {
            name: name,
            body: body,
            memory: memory,
            options: opts
        }
        return order;
    }

    addToQueue(request: SpawnOrder): void {
        let prio = request.options.priority
        if (this.canSpawn(request.body) && request.body.length > 0) {
            if (!this.productionQueue[prio]) {
                this.productionQueue[prio] = []
                this.productionPriorities.push(prio)
            }
            this.productionQueue[prio].push(request)
        }
    }

    canSpawn(body: BodyPartConstant[]): boolean {
		return bodyCost(body) <= this.room.energyCapacityAvailable;
    }

    private spawnHighestPriorityCreep(): number | undefined {
		let sortedKeys = _.sortBy(this.productionPriorities); //Sort prio list
		for (let prio of sortedKeys) {
            let nextOrder = this.productionQueue[prio].shift();
            if (nextOrder) {
                let res = this.spawnCreep(nextOrder)
                if (res == OK || res == ERR_BUSY) {
                    return res
                } else {
                    if (res != ERR_NOT_ENOUGH_ENERGY) {
                        this.productionQueue[prio].unshift(nextOrder)
                        return res
                    }
                }
            }
        }
        return -66
    }

    private spawnCreep(request: SpawnOrder): number {
        let body = request.body
        let name = request.name
        let memory = request.memory
        let options = request.options
        let spawnToUse: StructureSpawn | undefined;
        if (request.options.spawn) {
            spawnToUse = request.options.spawn!
            if(spawnToUse.spawning) {
                return ERR_BUSY
            }
            else {
				_.remove(this.availableSpawns, spawn => spawn.id == spawnToUse!.id); // mark as used
			}
        } else {
			spawnToUse = this.availableSpawns.shift(); //remove spawn to be used from the list
        }

        if (spawnToUse) {
            if (this.capital.coreSpawn && spawnToUse.id == this.capital.coreSpawn.id && !options.directions) {
                options.directions = [TOP, RIGHT]
            }

            if(bodyCost(body) > this.room.energyCapacityAvailable) {
                return ERR_NOT_ENOUGH_ENERGY
            }
            memory.data.origin = spawnToUse.pos.roomName
            let res = spawnToUse.spawnCreep(body, name, {
                memory: memory,
                directions: options.directions,
            })

            if (res == OK) {
                return res
            } else {
                this.availableSpawns.unshift(spawnToUse) //return spawn to stack if spawn unsuccessful
                return res
            }
        } else {
            return ERR_BUSY
        }


    }

    handleSpawns(): void {
        while (this.availableSpawns.length > 0) {
            let res = this.spawnHighestPriorityCreep();
        }

        //TODO Clear the exit position of spawns if a creep is about to spawn
    }
    init(): void {

    }

    run(): void {
		this.handleSpawns();
    }

}

function generateCreepID() {
    const hex = '0123456789ABCDEF';
    let creepID = '';
    for (let i = 0; i < 4; i++) {
        creepID += hex.charAt(Math.floor(Math.random() * hex.length));
    }
    return creepID
}