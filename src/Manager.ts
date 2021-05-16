interface IManagerInitialiser {
	name: string;
	room: Room | undefined;
	pos: RoomPosition;
	capital: Capital;
}

abstract class Manager {
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
}
