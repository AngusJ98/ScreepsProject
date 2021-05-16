interface IManagerInitialiser {
    ref: string;
	name: string;
	room: Room | undefined;
	pos: RoomPosition;
	capital: Capital;
	memory: any;
}

abstract class Manager {
	room: Room | undefined;
    capital: Capital;
	name: string;
	priority: number;
	ref: string;
	pos: RoomPosition;
    creeps: { [roleName: string]: Creep[] };
    constructor(initialiser: IManagerInitialiser, name: string, priority: number) {
        this.name = name
        this.room = initialiser.room
        this.capital = initialiser.capital
        this.priority = priority
        this.ref = initialiser.ref + "-" + this.name
        this.pos = initialiser.pos
        this.creeps = {}
    }

    grabCreeps(): void {
        this.creeps = _.groupBy(creepsByCapital[this.capital.name], r => r.memory.manager)
    }
}
