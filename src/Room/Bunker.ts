const baseAnchor = {"x": 25, "y": 25}
//A series of paths for the chargers
export const bunkerPath = {
    //bottomLeft
    6: [{"x":24,"y":26},{"x":24,"y":27},{"x":25,"y":28},{"x":24,"y":29},{"x":23,"y":30},{"x":22,"y":30},{"x":21,"y":29},{"x":20,"y":28},{"x":20,"y":27},{"x":21,"y":26},{"x":22,"y":25},{"x":23,"y":26},{"x":24,"y":26}],

    //topLeft
    8: [{"x":24,"y":24},{"x":23,"y":24},{"x":22,"y":25},{"x":21,"y":24},{"x":20,"y":23},{"x":20,"y":22},{"x":21,"y":21},{"x":22,"y":20},{"x":23,"y":20},{"x":24,"y":21},{"x":25,"y":22},{"x":24,"y":23},{"x":24,"y":24}],

    //topRight
    2: [{"x":26,"y":24},{"x":26,"y":23},{"x":25,"y":22},{"x":26,"y":21},{"x":27,"y":20},{"x":28,"y":20},{"x":29,"y":21},{"x":30,"y":22},{"x":30,"y":23},{"x":29,"y":24},{"x":28,"y":25},{"x":27,"y":24},{"x":26,"y":24}],

}

export const bunkerFillTargets = {
    //bottomLeft
    6: [{"x":22,"y":24},{"x":20,"y":25},{"x":21,"y":25},{"x":20,"y":26},{"x":22,"y":26},{"x":19,"y":27},{"x":21,"y":27},{"x":22,"y":27},{"x":19,"y":28},{"x":21,"y":28},{"x":22,"y":28},{"x":23,"y":28},{"x":24,"y":28},{"x":20,"y":29},{"x":22,"y":29},{"x":23,"y":29},{"x":25,"y":29},{"x":20,"y":30},{"x":21,"y":30},{"x":24,"y":30},{"x":25,"y":30},{"x":23,"y":27},{"x":25,"y":26},{"x":24,"y":25}]
}

interface BunkerCoord {
    x: number,
    y: number,
}

export function getRoomPosForBunkerCoord(bunkerCoord: BunkerCoord, anchor: ProtoPos): RoomPosition {
    let dx = bunkerCoord.x - baseAnchor.x
    let dy = bunkerCoord.y - baseAnchor.y
    return new RoomPosition(anchor.x + dx, anchor.y + dy, anchor.roomName)
}
