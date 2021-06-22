import { SpawnRequestOptions } from "Buildings/Barracks";
import { CreepSetup } from "Creep_Setups/CreepSetup";
import { config } from "config";
import { Capital } from "Room/Capital";

interface IManagerInitialiser {
	capital: Capital;
    pos: RoomPosition;
    room?: Room;
}



export abstract class Manager {
	room: Room | undefined;
    capital: Capital;
	name: string;
	priority: number;
    creeps: Creep[];
    creepsByRole: {[roleName: string]: Creep[]}
    pos: RoomPosition
    constructor(initialiser: IManagerInitialiser, name: string, priority: number) {
        //info from initialiser
        this.name = name
        this.room = Game.rooms[initialiser.pos.roomName]
        this.capital = initialiser.capital
        this.priority = priority
        this.pos = initialiser.pos
        //Get list of my creeps from capital and group them by role
        this.creeps = this.capital.creepsByManager[this.name] || []
        this.creepsByRole = _.groupBy(this.creeps, r => r.memory.role)

        this.capital.managers.push(this);
    }

    //Used for spawning logic. Takes a list of currently alive creeps and removes those that will be dead soon.
    //Used to calculate number of creeps needed, ignoring those that are nearly dead
    //TODO could maybe calculate move speed but that's a massive pain
    filterLife(creeps: Creep[], prespawn = 50) : Creep[] {
        let distance = 0
        if (this.capital.spawns[0]) {

            distance = this.pos? PathFinder.search(this.pos, this.capital.barracks!.pos, {maxOps: 4000}).cost || 0 : 0;
        }

        return _.filter(creeps, creep =>creep.ticksToLive! > CREEP_SPAWN_TIME * creep.body.length + distance + prespawn || creep.spawning || (!creep.spawning && !creep.ticksToLive));
    }

    //request a certain number of creeps! Will check currently existing creeps then add to queue based on manager
    //priority
    //REMEMBER TO NOT TRY THIS IF NO BARRACKS
    spawnList(quantity: number, setup: CreepSetup, opts = {} as SpawnRequestOptions) {
        //if not defined, use these options.
        _.defaults(opts, {priority: this.priority, prespawn: config.spawning.prespawn});
        let current: number = this.filterLife(this.creepsByRole[setup.role] || [], opts.prespawn).length
        let needed = quantity - current
        if (needed > 50) {
            console.log("too many requests from: ", this.name, "FIX now")
        }
        for (let i = 0; i < needed; i++) {
            this.requestCreep(setup, opts)
        }
    }

    //Adds a creep to the queue of the barracks. Ideally wishlist will be used to call this, but direct calls are technically allowed
    //if needed
    requestCreep(setup: CreepSetup, opts: SpawnRequestOptions) {
        _.defaults(opts, {priority: this.priority, prespawn: 50});
        //console.log("requesting creep " + setup.role)
        if (this.capital.barracks) {
            this.capital.barracks.addToQueue(setup, this, opts)
        }
    }

    //set abstract methods for each child class to implement their own logic

    //Ask for spawns here, and other pre state change actions
    abstract init(): void;

    //Used to assign creeps tasks if they don't have them
	abstract run(): void;
}
