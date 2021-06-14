interface ProtoPos {
	x: number;
	y: number;
	roomName: string;
}

interface CapitalMemory {
    outposts: string[],
    scoutTargets: string[],
    isBunker: boolean;
    anchor: ProtoPos;
  }
declare const require: (module: string) => any;
declare var global: any;


//declare var creepsByCapital: {[name: string]: Creep[]};
//declare var capitals: {[name: string]: Capital};

declare namespace NodeJS {
	interface Global {

		derefRoomPosition(protoPos: ProtoPos): RoomPosition,

	}
}


interface RoomMemory {
    lastSeen: number;
    controllerId: string | null;
    sources: number;
    hostileCreepCount:number;
}

interface CreepMemory {
    state?: "withdraw" | "transfer" | undefined;
    targetId?: string;
    killed: boolean;
    recycle: boolean;
    role: string;
    capital: string;
    routing?: any;
    manager: string;
    task?: null;
    data: {
        origin?: string,
    },
}


interface PathfinderReturn {
    path: RoomPosition[];
    ops: number;
    cost: number;
    incomplete: boolean;
}

interface TravelToReturnData {
    nextPos?: RoomPosition;
    pathfinderReturn?: PathfinderReturn;
    state?: TravelState;
    path?: string;
}

interface TravelToOptions {
    ignoreRoads?: boolean;
    ignoreCreeps?: boolean;
    ignoreStructures?: boolean;
    preferHighway?: boolean;
    highwayBias?: number;
    allowHostile?: boolean;
    allowSK?: boolean;
    range?: number;
    obstacles?: {pos: RoomPosition}[];
    roomCallback?: (roomName: string, matrix: CostMatrix) => CostMatrix | boolean;
    routeCallback?: (roomName: string) => number;
    returnData?: TravelToReturnData;
    restrictDistance?: number;
    useFindRoute?: boolean;
    maxOps?: number;
    movingTarget?: boolean;
    freshMatrix?: boolean;
    offRoad?: boolean;
    stuckValue?: number;
    maxRooms?: number;
    repath?: number;
    route?: {[roomName: string]: boolean};
    ensurePath?: boolean;
}

interface TravelData {
    state: any[];
    path: string;
}

interface TravelState {
    stuckCount: number;
    lastCoord: Coord;
    destination: RoomPosition;
    cpu: number;
}

interface Creep {
    travelTo(destination: HasPos|RoomPosition, ops?: TravelToOptions): number;
}

type Coord = {x: number, y: number};
type HasPos = {pos: RoomPosition}

