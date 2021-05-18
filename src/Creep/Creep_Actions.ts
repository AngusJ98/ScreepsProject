
interface Creep {
    goHarvest(target: Source | Mineral | Deposit): void;
}


const RANGES = {
	BUILD   : 3,
	REPAIR  : 3,
	TRANSFER: 1,
	WITHDRAW: 1,
	HARVEST : 1,
	DROP    : 0,
};


Creep.prototype.goHarvest = function(target: Source | Mineral | Deposit) {
    if (this.pos.inRangeTo(target.pos, RANGES.HARVEST)) {
        this.harvest(target)
    } else {
        this.travelTo(target)
    }
}
