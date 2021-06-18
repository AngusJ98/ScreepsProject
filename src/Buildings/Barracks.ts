import { bodyCost, CreepSetup } from "Creep_Setups/CreepSetup";
import { Roles, Setups } from "Creep_Setups/Setups";
import { Manager } from "Manager";
import { ChargerManager } from "Managers/ChargerManager";
import { CrisisManager } from "Managers/CrisisManager";
import { DefenseManager } from "Managers/DefenseManager";
import { QueenManager } from "Managers/QueenManager";
import { Capital } from "Room/Capital";
import { Building } from "./Building";

export interface SpawnOrder {
    body: BodyPartConstant[];
	name: string;
    memory: CreepMemory;
	options: SpawnRequestOptions,
}
export interface SpawnRequestOptions {
	spawn?: StructureSpawn;				// allows you to specify which spawn to use;
	directions?: DirectionConstant[];	// StructureSpawn.spawning.directions
    priority?: number;                   // Priority of spawning, lower number = higher prio
    prespawn?: number;                   // Spawn creep this many ticks early to prevent downtime
    targetId?: string;
    state?: "withdraw" | "transfer" | undefined;
}

export class Barracks extends Building {
    spawns: StructureSpawn[]
    coreSpawn: StructureSpawn;
    availableSpawns: StructureSpawn[];
    extensions: StructureExtension[];
    energyStructures: (StructureSpawn | StructureExtension)[];
    name: string;
    manager: QueenManager | ChargerManager;
    crisisManager?: CrisisManager; //used if capital is looking bad, or to start up a new capital
    defenseManager: DefenseManager;

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
        this.defenseManager = new DefenseManager(this)

        //Use a crisis manager if there is no queen and not enough energy to make one
        if (this.capital.room.energyAvailable < 1000 || this.capital.creepsByRole[Roles.queen].length < 2) {
            this.crisisManager = new CrisisManager(this)
        }

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
        const body: BodyPartConstant[] = setup.generateBody(this.room.energyCapacityAvailable)
        const memory: CreepMemory = {
            capital: manager.capital.name,
            manager: manager.name,
            role: setup.role,
            routing: null,
            task: null,
            recycle: false,
            killed: false,
            data: {},
            targetId: opts.targetId,
            state: opts.state,
        }
        const name = this.generateCreepName(setup.role)
        const order: SpawnOrder = {
            name,
            body,
            memory,
            options: opts
        }
        return order;
    }

    addToQueue(setup: CreepSetup, manager: Manager, opts: SpawnRequestOptions): void {
        const request = this.createSpawnOrder(setup, manager, opts)
        const prio = request.options.priority!
        if (this.canSpawn(request.body) && request.body.length > 0) {
            if (!this.productionQueue[prio]) {
                this.productionQueue[prio] = []
                this.productionPriorities.push(prio)
            }
            this.productionQueue[prio].push(request)

        } else {
            console.log("cannot spawn " + setup.role + " for " + manager + request.body)
            console.log(request.body.length)
            console.log(this.canSpawn(request.body))
        }
    }

    canSpawn(body: BodyPartConstant[]): boolean {
		return bodyCost(body) <= this.room.energyCapacityAvailable;
    }

    private spawnHighestPriorityCreep(): number | undefined {
		const sortedKeys = _.sortBy(this.productionPriorities); //Sort prio list
		for (const prio of sortedKeys) {
            const nextOrder = this.productionQueue[prio].shift();
            if (nextOrder) {
                const res = this.spawnCreep(nextOrder)
                if (res == OK || res == ERR_BUSY) {
                    return res
                } else {
                    if (res != ERR_NOT_ENOUGH_ENERGY) {
                        //this.productionQueue[prio].unshift(nextOrder)
                        return res
                    }
                }
            }
        }
        return -66
    }

    private spawnCreep(request: SpawnOrder): number {
        const body = request.body
        const name = request.name
        const memory = request.memory
        const options = request.options
        let spawnToUse: StructureSpawn | undefined;
        if (request.options.spawn) {
            spawnToUse = request.options.spawn
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

            if(bodyCost(body) > this.room.energyCapacityAvailable) {
                return ERR_NOT_ENOUGH_ENERGY
            }
            memory.data.origin = spawnToUse.pos.roomName
            const res = spawnToUse.spawnCreep(body, name, {
                memory,
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

        let res:number | undefined = 0
        while (this.availableSpawns.length > 0 && res != -66) {
            res = this.spawnHighestPriorityCreep();
        }

        //TODO Clear the exit position of spawns if a creep is about to spawn
    }
    init(): void {

    }

    run(): void {
        console.log(this.room.name,"-------", _.map(this.productionQueue, r => _.map(r, t => t.name)))
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
