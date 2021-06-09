import { minBy } from "Rando_Functions"

declare global {
	interface RoomPosition {
		getAdjacentPositions(range?: number, filteredStructures?: boolean): RoomPosition[];
		roomCoords: Coord;
		getMultiRoomRangeTo(pos: RoomPosition): number;
		findClosestByMultiRoomRange<T extends _HasRoomPosition>(objects: T[]): T | undefined;
	}
}
export function test4() {

}
RoomPosition.prototype.getAdjacentPositions = function(range = 1, filterStructures: boolean = false): RoomPosition[] {
    let roomName = this.roomName
    let terrain = Game.map.getRoomTerrain(roomName)
    let offsets = []
	for (let x = -range; x <= range; x++) { for (let y = -range; y <= range; y++) {
		if (x === 0 && y === 0 || Math.abs(x) + Math.abs(y) < range) continue; // Don't include the 0,0 point
		offsets.push({ x, y });
	}}

	let positions = _.map(offsets, r => new RoomPosition(this.x + r.x, this.y + r.y, this.roomName))
	_.remove(positions, r => !([0, 1].includes(terrain.get(r.x, r.y))))
	if (filterStructures) {
		let clearPos = []
		for (let pos of positions) {
			if (!(_.some(OBSTACLE_OBJECT_TYPES, pos.lookFor(LOOK_STRUCTURES)))){
				clearPos.push(pos)
			}
		}
		return clearPos
	} else {
		return positions
	}
}




RoomPosition.prototype.getMultiRoomRangeTo = function(pos: RoomPosition): number {
	if (this.roomName == pos.roomName) {
		return this.getRangeTo(pos);
	} else {
		const from = this.roomCoords;
		const to = pos.roomCoords;
		const dx = Math.abs(50 * (to.x - from.x) + pos.x - this.x);
		const dy = Math.abs(50 * (to.y - from.y) + pos.y - this.y);
		return _.max([dx, dy]);
	}
};

Object.defineProperty(RoomPosition.prototype, 'roomCoords', {
	get         : function() {
		const parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(this.roomName);
		let x = parseInt(parsed![1], 10);
		let y = parseInt(parsed![2], 10);
		if (this.roomName.includes('W')) x = -x;
		if (this.roomName.includes('N')) y = -y;
		return {x: x, y: y} as Coord;
	},
	configurable: true,
});

RoomPosition.prototype.findClosestByMultiRoomRange = function <T extends _HasRoomPosition>(objects: T[]):
	T | undefined {
	return minBy(objects, (obj: T) => this.getMultiRoomRangeTo(obj.pos));
};
