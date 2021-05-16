interface RoomPosition {
    getAdjacentPositions(): RoomPosition[];
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
