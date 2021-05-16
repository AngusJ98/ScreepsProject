export class MiningSite {
    source: Source;
    name: string;
    room: Room | undefined;
	pos: RoomPosition;
	capital: Capital;
    manager: MiningManager

    constructor(source: Source, capital: Capital) {
        this.source = source;
        this.name = "Mining_Site_" + source.id;
        this.room = source.room;
        this.pos = source.pos;
        this.capital = capital;
        this.manager = new MiningManager(this)
    }
}
