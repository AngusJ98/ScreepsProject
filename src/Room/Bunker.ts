const baseAnchor = {"x": 25, "y": 25}
//A series of paths for the chargers

interface BunkerCoord {
    x: number,
    y: number,
}

//A static class of bunker methods
export class Bunker {
    static bunkerFillTargets = {
        //bottomLeft
        6: [{"x":22,"y":24},{"x":20,"y":25},{"x":21,"y":25},{"x":20,"y":26},{"x":22,"y":26},{"x":19,"y":27},{"x":21,"y":27},{"x":22,"y":27},{"x":19,"y":28},{"x":21,"y":28},{"x":22,"y":28},{"x":23,"y":28},{"x":24,"y":28},{"x":20,"y":29},{"x":22,"y":29},{"x":23,"y":29},{"x":25,"y":29},{"x":20,"y":30},{"x":21,"y":30},{"x":24,"y":30},{"x":25,"y":30},{"x":23,"y":27},{"x":25,"y":26},{"x":24,"y":25}, {"x":23,"y":25},{"x":25,"y":27}],

        //topLeft
        8: [{"x":22,"y":19},{"x":23,"y":19},{"x":20,"y":20},{"x":21,"y":20},{"x":24,"y":20},{"x":20,"y":21},{"x":22,"y":21},{"x":23,"y":21},{"x":25,"y":21},{"x":19,"y":22},{"x":21,"y":22},{"x":22,"y":22},{"x":23,"y":22},{"x":24,"y":22},{"x":26,"y":22},{"x":19,"y":23},{"x":21,"y":23},{"x":22,"y":23},{"x":20,"y":24},{"x":22,"y":24},{"x":20,"y":25},{"x":21,"y":25},{"x":22,"y":26},{"x":23,"y":23},{"x":25,"y":24},{"x":24,"y":25},{"x":25,"y":23}, {"x": 23, "y": 25}],

        //topRight
        2: [{"x":27,"y":19},{"x":28,"y":19},{"x":26,"y":20},{"x":29,"y":20},{"x":30,"y":20},{"x":25,"y":21},{"x":27,"y":21},{"x":28,"y":21},{"x":30,"y":21},{"x":24,"y":22},{"x":26,"y":22},{"x":27,"y":22},{"x":28,"y":22},{"x":29,"y":22},{"x":28,"y":23},{"x":29,"y":23},{"x":28,"y":24},{"x":30,"y":24},{"x":29,"y":25},{"x":30,"y":25},{"x":25,"y":23},{"x":27,"y":23},{"x":25,"y":24},{"x":27,"y":25}]
    }

    static bunkerPath = {
        //bottomLeft
        6: [{"x":24,"y":26},{"x":24,"y":27},{"x":25,"y":28},{"x":24,"y":29},{"x":23,"y":30},{"x":22,"y":30},{"x":21,"y":29},{"x":20,"y":28},{"x":20,"y":27},{"x":21,"y":26},{"x":22,"y":25},{"x":23,"y":26},{"x":24,"y":26}],

        //topLeft
        8: [{"x":24,"y":24},{"x":23,"y":24},{"x":22,"y":25},{"x":21,"y":24},{"x":20,"y":23},{"x":20,"y":22},{"x":21,"y":21},{"x":22,"y":20},{"x":23,"y":20},{"x":24,"y":21},{"x":25,"y":22},{"x":24,"y":23},{"x":24,"y":24}],

        //topRight
        2: [{"x":26,"y":24},{"x":26,"y":23},{"x":25,"y":22},{"x":26,"y":21},{"x":27,"y":20},{"x":28,"y":20},{"x":29,"y":21},{"x":30,"y":22},{"x":30,"y":23},{"x":29,"y":24},{"x":28,"y":25},{"x":27,"y":24},{"x":26,"y":24}],

    }
    static getRoomPosForBunkerCoord(bunkerCoord: BunkerCoord, anchor: ProtoPos): RoomPosition {
        let dx = bunkerCoord.x - baseAnchor.x
        let dy = bunkerCoord.y - baseAnchor.y
        return new RoomPosition(anchor.x + dx, anchor.y + dy, anchor.roomName)
    }

    static getFillStructureAtPosition(pos:RoomPosition): (StructureExtension | StructureTower | StructureSpawn)[]{
        let structs = pos.lookFor(LOOK_STRUCTURES)
        return _.filter(structs, r => r.structureType == STRUCTURE_EXTENSION || r.structureType == STRUCTURE_TOWER || r.structureType == STRUCTURE_SPAWN) as (StructureExtension | StructureTower | StructureSpawn)[]
    }

    static getFillStructuresFromList(anchor: RoomPosition, posList: BunkerCoord[]): (StructureExtension | StructureTower | StructureSpawn)[] {
        let structs: (StructureExtension | StructureTower | StructureSpawn)[] = []
        for (let pogPos of posList) {
            let pos = Bunker.getRoomPosForBunkerCoord(pogPos, anchor)
            structs.concat(Bunker.getFillStructureAtPosition(pos))
        }
        return structs
    }

    static getPathFromList(anchor: RoomPosition, path: BunkerCoord[]) {
        return _.map(path, r => Bunker.getRoomPosForBunkerCoord(r, anchor))
    }
}
