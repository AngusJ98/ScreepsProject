import { minBy } from "Rando_Functions"

declare global {
	interface RoomPosition {
		getAdjacentPositions(): RoomPosition[];
		roomCoords: Coord;
		getMultiRoomRangeTo(pos: RoomPosition): number;
		findClosestByMultiRoomRange<T extends _HasRoomPosition>(objects: T[]): T | undefined;
	}
}
export function test4() {

}
RoomPosition.prototype.getAdjacentPositions = function(): RoomPosition[] {
    let roomName = this.roomName
    let terrain = Game.map.getRoomTerrain(roomName)
    let positions = []
    for (let x = this.x -1; x < this.x + 2; x++) {
        for (let y = this.y -1; y < this.y + 2; y++) {
            let terrainAtPositon = terrain.get(x, y)
            if (terrainAtPositon === TERRAIN_MASK_SWAMP || terrainAtPositon === 0) {

                positions.push(new RoomPosition(x, y, roomName));
                //console.log(positions)
            }
        }
    }
    return positions
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
