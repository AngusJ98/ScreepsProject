import { SpawnRequestOptions } from "Buildings/Barracks";
import { CreepSetup } from "Creep_Setups/CreepSetup";
import { Capital } from "Room/Capital";

interface IManagerInitialiser {
	name: string;
	room: Room | undefined;
	pos: RoomPosition;
	capital: Capital;
}



export abstract class Manager {
	room: Room | undefined;
    capital: Capital;
	name: string;
	priority: number;
	pos: RoomPosition;
    creeps: Creep[];
    creepsByRole: {[roleName: string]: Creep[]}
    constructor(initialiser: IManagerInitialiser, name: string, priority: number) {
        //info from initialiser
        this.name = name
        this.room = initialiser.room
        this.capital = initialiser.capital
        this.priority = priority
        this.pos = initialiser.pos

        //Get list of my creeps from capital and group them by role
        this.creeps = this.capital.creepsByManager[this.name]
        this.creepsByRole = _.groupBy(this.creeps, r => r.memory.role)
    }

    //Used for spawning logic. Takes a list of currently alive creeps and removes those that will be dead soon.
    //Used to calculate number of creeps needed, ignoring those that are nearly dead
    //TODO could maybe calculate move speed but that's a massive pain
    filterLife(creeps: Creep[], prespawn = 50) : Creep[] {
        let distance = 0
        if (this.capital.spawns[0]) {
            distance = PathFinder.search(this.pos, this.capital.barracks!.pos, {maxOps: 4000}).cost || 0
        }

        return _.filter(creeps, creep =>creep.ticksToLive! > CREEP_SPAWN_TIME * creep.body.length + distance + prespawn || creep.spawning || (!creep.spawning && !creep.ticksToLive));
    }

    //request a certain number of creeps! Will check currently existing creeps then add to queue based on manager
    //priority
    //REMEMBER TO NOT TRY THIS IF NO BARRACKS
    spawnList(quantity: number, setup: CreepSetup, opts = {} as SpawnRequestOptions) {
        //if not defined, use these options.
        _.defaults(opts, {priority: this.priority, prespawn: config.spawning.prespawn});

    }

    //set abstract methods for each child class to implement their own logic

    //Ask for spawns here, and other pre state change actions
    abstract init(): void;

    //Used to assign creeps tasks if they don't have them
	abstract run(): void;
}
