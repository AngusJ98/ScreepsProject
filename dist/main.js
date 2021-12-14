'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/**
 * To start using Traveler, require it in main.js:
 * Example: var Traveler = require('Traveler.js');
 */
//@ts-nocheck
class Traveler {
    /**
     * move creep to destination
     * @param creep
     * @param destination
     * @param options
     * @returns {number}
     */
    static travelTo(creep, destination, options = {}) {
        // uncomment if you would like to register hostile rooms entered
        // this.updateRoomStatus(creep.room);
        if (!destination) {
            return ERR_INVALID_ARGS;
        }
        if (creep.fatigue > 0) {
            Traveler.circle(creep.pos, "aqua", .3);
            return ERR_TIRED;
        }
        destination = this.normalizePos(destination);
        // manage case where creep is nearby destination
        let rangeToDestination = creep.pos.getRangeTo(destination);
        if (options.range && rangeToDestination <= options.range) {
            return OK;
        }
        else if (rangeToDestination <= 1) {
            if (rangeToDestination === 1 && !options.range) {
                let direction = creep.pos.getDirectionTo(destination);
                if (options.returnData) {
                    options.returnData.nextPos = destination;
                    options.returnData.path = direction.toString();
                }
                return creep.move(direction);
            }
            return OK;
        }
        // initialize data object
        if (!creep.memory._trav) {
            delete creep.memory._travel;
            creep.memory._trav = {};
        }
        let travelData = creep.memory._trav;
        let state = this.deserializeState(travelData, destination);
        // uncomment to visualize destination
        // this.circle(destination.pos, "orange");
        // check if creep is stuck
        if (this.isStuck(creep, state)) {
            state.stuckCount++;
            Traveler.circle(creep.pos, "magenta", state.stuckCount * .2);
        }
        else {
            state.stuckCount = 0;
        }
        // handle case where creep is stuck
        if (!options.stuckValue) {
            options.stuckValue = DEFAULT_STUCK_VALUE;
        }
        if (state.stuckCount >= options.stuckValue && Math.random() > .5) {
            options.ignoreCreeps = false;
            options.freshMatrix = true;
            delete travelData.path;
        }
        // TODO:handle case where creep moved by some other function, but destination is still the same
        // delete path cache if destination is different
        if (!this.samePos(state.destination, destination)) {
            if (options.movingTarget && state.destination.isNearTo(destination)) {
                travelData.path += state.destination.getDirectionTo(destination);
                state.destination = destination;
            }
            else {
                delete travelData.path;
            }
        }
        if (options.repath && Math.random() < options.repath) {
            // add some chance that you will find a new path randomly
            delete travelData.path;
        }
        // pathfinding
        let newPath = false;
        if (!travelData.path) {
            newPath = true;
            if (creep.spawning) {
                return ERR_BUSY;
            }
            state.destination = destination;
            let cpu = Game.cpu.getUsed();
            let ret = this.findTravelPath(creep.pos, destination, options);
            let cpuUsed = Game.cpu.getUsed() - cpu;
            state.cpu = _.round(cpuUsed + state.cpu);
            if (state.cpu > REPORT_CPU_THRESHOLD) {
                // see note at end of file for more info on this
                console.log(`TRAVELER: heavy cpu use: ${creep.name}, cpu: ${state.cpu} origin: ${creep.pos}, dest: ${destination}`);
            }
            let color = "orange";
            if (ret.incomplete) {
                // uncommenting this is a great way to diagnose creep behavior issues
                // console.log(`TRAVELER: incomplete path for ${creep.name}`);
                color = "red";
            }
            if (options.returnData) {
                options.returnData.pathfinderReturn = ret;
            }
            travelData.path = Traveler.serializePath(creep.pos, ret.path, color);
            state.stuckCount = 0;
        }
        this.serializeState(creep, destination, state, travelData);
        if (!travelData.path || travelData.path.length === 0) {
            return ERR_NO_PATH;
        }
        // consume path
        if (state.stuckCount === 0 && !newPath) {
            travelData.path = travelData.path.substr(1);
        }
        let nextDirection = parseInt(travelData.path[0], 10);
        if (options.returnData) {
            if (nextDirection) {
                let nextPos = Traveler.positionAtDirection(creep.pos, nextDirection);
                if (nextPos) {
                    options.returnData.nextPos = nextPos;
                }
            }
            options.returnData.state = state;
            options.returnData.path = travelData.path;
        }
        return creep.move(nextDirection);
    }
    /**
     * make position objects consistent so that either can be used as an argument
     * @param destination
     * @returns {any}
     */
    static normalizePos(destination) {
        if (!(destination instanceof RoomPosition)) {
            return destination.pos;
        }
        return destination;
    }
    /**
     * check if room should be avoided by findRoute algorithm
     * @param roomName
     * @returns {RoomMemory|number}
     */
    static checkAvoid(roomName) {
        return Memory.rooms && Memory.rooms[roomName] && Memory.rooms[roomName].avoid;
    }
    /**
     * check if a position is an exit
     * @param pos
     * @returns {boolean}
     */
    static isExit(pos) {
        return pos.x === 0 || pos.y === 0 || pos.x === 49 || pos.y === 49;
    }
    /**
     * check two coordinates match
     * @param pos1
     * @param pos2
     * @returns {boolean}
     */
    static sameCoord(pos1, pos2) {
        return pos1.x === pos2.x && pos1.y === pos2.y;
    }
    /**
     * check if two positions match
     * @param pos1
     * @param pos2
     * @returns {boolean}
     */
    static samePos(pos1, pos2) {
        return this.sameCoord(pos1, pos2) && pos1.roomName === pos2.roomName;
    }
    /**
     * draw a circle at position
     * @param pos
     * @param color
     * @param opacity
     */
    static circle(pos, color, opacity) {
        new RoomVisual(pos.roomName).circle(pos, {
            radius: .45, fill: "transparent", stroke: color, strokeWidth: .15, opacity: opacity
        });
    }
    /**
     * update memory on whether a room should be avoided based on controller owner
     * @param room
     */
    static updateRoomStatus(room) {
        if (!room) {
            return;
        }
        if (room.controller) {
            if (room.controller.owner && !room.controller.my) {
                room.memory.avoid = 1;
            }
            else {
                delete room.memory.avoid;
            }
        }
    }
    /**
     * find a path from origin to destination
     * @param origin
     * @param destination
     * @param options
     * @returns {PathfinderReturn}
     */
    static findTravelPath(origin, destination, options = {}) {
        _.defaults(options, {
            ignoreCreeps: true,
            maxOps: DEFAULT_MAXOPS,
            range: 1,
        });
        if (options.movingTarget) {
            options.range = 0;
        }
        origin = this.normalizePos(origin);
        destination = this.normalizePos(destination);
        let originRoomName = origin.roomName;
        let destRoomName = destination.roomName;
        // check to see whether findRoute should be used
        let roomDistance = Game.map.getRoomLinearDistance(origin.roomName, destination.roomName);
        let allowedRooms = options.route;
        if (!allowedRooms && (options.useFindRoute || (options.useFindRoute === undefined && roomDistance > 2))) {
            let route = this.findRoute(origin.roomName, destination.roomName, options);
            if (route) {
                allowedRooms = route;
            }
        }
        let roomsSearched = 0;
        let callback = (roomName) => {
            if (allowedRooms) {
                if (!allowedRooms[roomName]) {
                    return false;
                }
            }
            else if (!options.allowHostile && Traveler.checkAvoid(roomName)
                && roomName !== destRoomName && roomName !== originRoomName) {
                return false;
            }
            roomsSearched++;
            let matrix;
            let room = Game.rooms[roomName];
            if (room) {
                if (options.ignoreStructures) {
                    matrix = new PathFinder.CostMatrix();
                    if (!options.ignoreCreeps) {
                        Traveler.addCreepsToMatrix(room, matrix);
                    }
                }
                else if (options.ignoreCreeps || roomName !== originRoomName) {
                    matrix = this.getStructureMatrix(room, options.freshMatrix);
                }
                else {
                    matrix = this.getCreepMatrix(room);
                }
                if (options.obstacles) {
                    matrix = matrix.clone();
                    for (let obstacle of options.obstacles) {
                        if (obstacle.pos.roomName !== roomName) {
                            continue;
                        }
                        matrix.set(obstacle.pos.x, obstacle.pos.y, 0xff);
                    }
                }
            }
            if (options.roomCallback) {
                if (!matrix) {
                    matrix = new PathFinder.CostMatrix();
                }
                let outcome = options.roomCallback(roomName, matrix.clone());
                if (outcome !== undefined) {
                    return outcome;
                }
            }
            return matrix;
        };
        let ret = PathFinder.search(origin, { pos: destination, range: options.range }, {
            maxOps: options.maxOps,
            maxRooms: options.maxRooms,
            plainCost: options.offRoad ? 1 : options.ignoreRoads ? 1 : 2,
            swampCost: options.offRoad ? 1 : options.ignoreRoads ? 5 : 10,
            roomCallback: callback,
        });
        if (ret.incomplete && options.ensurePath) {
            if (options.useFindRoute === undefined) {
                // handle case where pathfinder failed at a short distance due to not using findRoute
                // can happen for situations where the creep would have to take an uncommonly indirect path
                // options.allowedRooms and options.routeCallback can also be used to handle this situation
                if (roomDistance <= 2) {
                    console.log(`TRAVELER: path failed without findroute, trying with options.useFindRoute = true`);
                    console.log(`from: ${origin}, destination: ${destination}`);
                    options.useFindRoute = true;
                    ret = this.findTravelPath(origin, destination, options);
                    console.log(`TRAVELER: second attempt was ${ret.incomplete ? "not " : ""}successful`);
                    return ret;
                }
                // TODO: handle case where a wall or some other obstacle is blocking the exit assumed by findRoute
            }
            else {
            }
        }
        return ret;
    }
    /**
     * find a viable sequence of rooms that can be used to narrow down pathfinder's search algorithm
     * @param origin
     * @param destination
     * @param options
     * @returns {{}}
     */
    static findRoute(origin, destination, options = {}) {
        let restrictDistance = options.restrictDistance || Game.map.getRoomLinearDistance(origin, destination) + 10;
        let allowedRooms = { [origin]: true, [destination]: true };
        let highwayBias = 1;
        if (options.preferHighway) {
            highwayBias = 2.5;
            if (options.highwayBias) {
                highwayBias = options.highwayBias;
            }
        }
        let ret = Game.map.findRoute(origin, destination, {
            routeCallback: (roomName) => {
                if (options.routeCallback) {
                    let outcome = options.routeCallback(roomName);
                    if (outcome !== undefined) {
                        return outcome;
                    }
                }
                let rangeToRoom = Game.map.getRoomLinearDistance(origin, roomName);
                if (rangeToRoom > restrictDistance) {
                    // room is too far out of the way
                    return Number.POSITIVE_INFINITY;
                }
                if (!options.allowHostile && Traveler.checkAvoid(roomName) &&
                    roomName !== destination && roomName !== origin) {
                    // room is marked as "avoid" in room memory
                    return Number.POSITIVE_INFINITY;
                }
                let parsed;
                if (options.preferHighway) {
                    parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
                    let isHighway = (parsed[1] % 10 === 0) || (parsed[2] % 10 === 0);
                    if (isHighway) {
                        return 1;
                    }
                }
                // SK rooms are avoided when there is no vision in the room, harvested-from SK rooms are allowed
                if (!options.allowSK && !Game.rooms[roomName]) {
                    if (!parsed) {
                        parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
                    }
                    let fMod = parsed[1] % 10;
                    let sMod = parsed[2] % 10;
                    let isSK = !(fMod === 5 && sMod === 5) &&
                        ((fMod >= 4) && (fMod <= 6)) &&
                        ((sMod >= 4) && (sMod <= 6));
                    if (isSK) {
                        return 10 * highwayBias;
                    }
                }
                return highwayBias;
            },
        });
        if (!_.isArray(ret)) {
            console.log(`couldn't findRoute to ${destination}`);
            return;
        }
        for (let value of ret) {
            allowedRooms[value.room] = true;
        }
        return allowedRooms;
    }
    /**
     * check how many rooms were included in a route returned by findRoute
     * @param origin
     * @param destination
     * @returns {number}
     */
    static routeDistance(origin, destination) {
        let linearDistance = Game.map.getRoomLinearDistance(origin, destination);
        if (linearDistance >= 32) {
            return linearDistance;
        }
        let allowedRooms = this.findRoute(origin, destination);
        if (allowedRooms) {
            return Object.keys(allowedRooms).length;
        }
    }
    /**
     * build a cost matrix based on structures in the room. Will be cached for more than one tick. Requires vision.
     * @param room
     * @param freshMatrix
     * @returns {any}
     */
    static getStructureMatrix(room, freshMatrix) {
        if (!this.structureMatrixCache[room.name] || (freshMatrix && Game.time !== this.structureMatrixTick)) {
            this.structureMatrixTick = Game.time;
            let matrix = new PathFinder.CostMatrix();
            this.structureMatrixCache[room.name] = Traveler.addStructuresToMatrix(room, matrix, 1);
        }
        return this.structureMatrixCache[room.name];
    }
    /**
     * build a cost matrix based on creeps and structures in the room. Will be cached for one tick. Requires vision.
     * @param room
     * @returns {any}
     */
    static getCreepMatrix(room) {
        if (!this.creepMatrixCache[room.name] || Game.time !== this.creepMatrixTick) {
            this.creepMatrixTick = Game.time;
            this.creepMatrixCache[room.name] = Traveler.addCreepsToMatrix(room, this.getStructureMatrix(room, true).clone());
        }
        return this.creepMatrixCache[room.name];
    }
    /**
     * add structures to matrix so that impassible structures can be avoided and roads given a lower cost
     * @param room
     * @param matrix
     * @param roadCost
     * @returns {CostMatrix}
     */
    static addStructuresToMatrix(room, matrix, roadCost) {
        let impassibleStructures = [];
        for (let structure of room.find(FIND_STRUCTURES)) {
            if (structure instanceof StructureRampart) {
                if (!structure.my && !structure.isPublic) {
                    impassibleStructures.push(structure);
                }
            }
            else if (structure instanceof StructureRoad) {
                matrix.set(structure.pos.x, structure.pos.y, roadCost);
            }
            else if (structure instanceof StructureContainer) {
                matrix.set(structure.pos.x, structure.pos.y, 5);
            }
            else {
                impassibleStructures.push(structure);
            }
        }
        for (let site of room.find(FIND_MY_CONSTRUCTION_SITES)) {
            if (site.structureType === STRUCTURE_CONTAINER || site.structureType === STRUCTURE_ROAD
                || site.structureType === STRUCTURE_RAMPART) {
                continue;
            }
            matrix.set(site.pos.x, site.pos.y, 0xff);
        }
        for (let structure of impassibleStructures) {
            matrix.set(structure.pos.x, structure.pos.y, 0xff);
        }
        return matrix;
    }
    /**
     * add creeps to matrix so that they will be avoided by other creeps
     * @param room
     * @param matrix
     * @returns {CostMatrix}
     */
    static addCreepsToMatrix(room, matrix) {
        room.find(FIND_CREEPS).forEach((creep) => matrix.set(creep.pos.x, creep.pos.y, 0xff));
        return matrix;
    }
    /**
     * serialize a path, traveler style. Returns a string of directions.
     * @param startPos
     * @param path
     * @param color
     * @returns {string}
     */
    static serializePath(startPos, path, color = "orange") {
        let serializedPath = "";
        let lastPosition = startPos;
        this.circle(startPos, color);
        for (let position of path) {
            if (position.roomName === lastPosition.roomName) {
                new RoomVisual(position.roomName)
                    .line(position, lastPosition, { color: color, lineStyle: "dashed" });
                serializedPath += lastPosition.getDirectionTo(position);
            }
            lastPosition = position;
        }
        return serializedPath;
    }
    /**
     * returns a position at a direction relative to origin
     * @param origin
     * @param direction
     * @returns {RoomPosition}
     */
    static positionAtDirection(origin, direction) {
        let offsetX = [0, 0, 1, 1, 1, 0, -1, -1, -1];
        let offsetY = [0, -1, -1, 0, 1, 1, 1, 0, -1];
        let x = origin.x + offsetX[direction];
        let y = origin.y + offsetY[direction];
        if (x > 49 || x < 0 || y > 49 || y < 0) {
            return;
        }
        return new RoomPosition(x, y, origin.roomName);
    }
    /**
     * convert room avoidance memory from the old pattern to the one currently used
     * @param cleanup
     */
    static patchMemory(cleanup = false) {
        if (!Memory.empire) {
            return;
        }
        if (!Memory.empire.hostileRooms) {
            return;
        }
        let count = 0;
        for (let roomName in Memory.empire.hostileRooms) {
            if (Memory.empire.hostileRooms[roomName]) {
                if (!Memory.rooms[roomName]) {
                    Memory.rooms[roomName] = {};
                }
                Memory.rooms[roomName].avoid = 1;
                count++;
            }
            if (cleanup) {
                delete Memory.empire.hostileRooms[roomName];
            }
        }
        if (cleanup) {
            delete Memory.empire.hostileRooms;
        }
        console.log(`TRAVELER: room avoidance data patched for ${count} rooms`);
    }
    static deserializeState(travelData, destination) {
        let state = {};
        if (travelData.state) {
            state.lastCoord = { x: travelData.state[STATE_PREV_X], y: travelData.state[STATE_PREV_Y] };
            state.cpu = travelData.state[STATE_CPU];
            state.stuckCount = travelData.state[STATE_STUCK];
            state.destination = new RoomPosition(travelData.state[STATE_DEST_X], travelData.state[STATE_DEST_Y], travelData.state[STATE_DEST_ROOMNAME]);
        }
        else {
            state.cpu = 0;
            state.destination = destination;
        }
        return state;
    }
    static serializeState(creep, destination, state, travelData) {
        travelData.state = [creep.pos.x, creep.pos.y, state.stuckCount, state.cpu, destination.x, destination.y,
            destination.roomName];
    }
    static isStuck(creep, state) {
        let stuck = false;
        if (state.lastCoord !== undefined) {
            if (this.sameCoord(creep.pos, state.lastCoord)) {
                // didn't move
                stuck = true;
            }
            else if (this.isExit(creep.pos) && this.isExit(state.lastCoord)) {
                // moved against exit
                stuck = true;
            }
        }
        return stuck;
    }
}
Traveler.structureMatrixCache = {};
Traveler.creepMatrixCache = {};
// this might be higher than you wish, setting it lower is a great way to diagnose creep behavior issues. When creeps
// need to repath to often or they aren't finding valid paths, it can sometimes point to problems elsewhere in your code
const REPORT_CPU_THRESHOLD = 1000;
const DEFAULT_MAXOPS = 200000;
const DEFAULT_STUCK_VALUE = 1;
const STATE_PREV_X = 0;
const STATE_PREV_Y = 1;
const STATE_STUCK = 2;
const STATE_CPU = 3;
const STATE_DEST_X = 4;
const STATE_DEST_Y = 5;
const STATE_DEST_ROOMNAME = 6;
// assigns a function to Creep.prototype: creep.travelTo(destination)

var config = {
    signature: "Aozin",
    username: "Aozin",
    nextRoom: {
        scoutMinControllerLevel: 4,
        intervalToCheck: CREEP_CLAIM_LIFE_TIME,
        maxRooms: 8,
        cpuPerRoom: 13,
        // creep max run distance for next room
        // if terminal should send energy rooms should be close
        maxDistance: 10,
        minNewRoomDistance: 2,
        minEnergyForActive: 1000,
        notify: false,
    },
    room: {
        reservedRCL: {
            0: 1,
            1: 1,
            2: 1,
            3: 1,
            4: 1,
            5: 1,
            6: 1,
            7: 1,
            8: 1,
        },
        isHealthyStorageThreshold: 50000,
        rebuildLayout: 7654,
        handleNukeAttackInterval: 132,
        reviveEnergyCapacity: 1000,
        reviveEnergyAvailable: 1000,
        scoutInterval: 1499,
        scout: true,
        upgraderMinStorage: 0,
        upgraderStorageFactor: 2,
        lastSeenThreshold: 1000000,
        notify: false,
        observerRange: 5,
    },
    spawning: {
        prespawn: 50,
    },
    crisis: {
        emergencyMinersEnergyLimit: 1000,
    },
};

const RANGES = {
    BUILD: 3,
    REPAIR: 3,
    UPGRADE: 3,
    DECONSTRUCT: 1,
    SIGN: 1,
    TRANSFER: 1,
    WITHDRAW: 1,
    HARVEST: 1,
    RESERVE: 1,
    CLAIM: 1,
    MELEE: 1,
    DROP: 0,
};
function test3() {
}
Creep.prototype.goBuild = function (target) {
    if (this.pos.inRangeTo(target.pos, RANGES.BUILD)) {
        this.build(target);
    }
    else {
        this.travelTo(target);
    }
};
Creep.prototype.goDeconstruct = function (target) {
    if (this.pos.inRangeTo(target.pos, RANGES.DECONSTRUCT)) {
        this.dismantle(target);
    }
    else {
        this.travelTo(target);
    }
};
Creep.prototype.goRepair = function (target) {
    if (this.pos.inRangeTo(target.pos, RANGES.REPAIR)) {
        this.repair(target);
    }
    else {
        this.travelTo(target);
    }
};
Creep.prototype.goTransfer = function (target) {
    if (this.pos.inRangeTo(target.pos, RANGES.TRANSFER)) {
        _.forEach(_.keys(this.store), r => this.transfer(target, r));
    }
    else {
        this.travelTo(target);
    }
};
Creep.prototype.goWithdraw = function (target, resource = RESOURCE_ENERGY) {
    if (this.pos.inRangeTo(target.pos, RANGES.TRANSFER)) {
        if (target instanceof Resource) {
            this.pickup(target);
        }
        else {
            this.withdraw(target, resource);
        }
    }
    else {
        this.travelTo(target);
    }
};
Creep.prototype.goHarvest = function (target, opts) {
    if (this.pos.inRangeTo(target.pos, RANGES.HARVEST)) {
        this.harvest(target);
    }
    else {
        this.travelTo(target, opts);
    }
};
Creep.prototype.goDrop = function (target, resource = RESOURCE_ENERGY) {
    if (this.pos.inRangeTo(target, RANGES.DROP)) {
        this.drop(resource);
    }
    else {
        this.travelTo(target);
    }
};
Creep.prototype.goSign = function (target) {
    if (this.pos.inRangeTo(target, RANGES.SIGN)) {
        this.signController(target, config.signature);
    }
    else {
        this.travelTo(target);
    }
};
Creep.prototype.goUpgrade = function (target) {
    if (this.pos.inRangeTo(target.pos, RANGES.UPGRADE)) {
        this.upgradeController(target);
    }
    else {
        this.travelTo(target);
    }
};
Creep.prototype.goReserve = function (target) {
    if (this.getActiveBodyparts(CLAIM) == 0) {
        this.say("No claim body parts, fix now");
    }
    else if (this.pos.inRangeTo(target.pos, RANGES.RESERVE)) {
        this.reserveController(target);
    }
    else {
        this.travelTo(target);
    }
};
Creep.prototype.goClaim = function (target) {
    if (this.getActiveBodyparts(CLAIM) == 0) {
        this.say("No claim body parts, fix now");
    }
    else if (this.pos.inRangeTo(target.pos, RANGES.CLAIM)) {
        this.claimController(target);
    }
    else {
        this.travelTo(target);
    }
};
Creep.prototype.goAttackController = function (target) {
    if (this.getActiveBodyparts(CLAIM) == 0) {
        this.say("No claim body parts, fix now");
    }
    else if (this.pos.inRangeTo(target.pos, RANGES.CLAIM)) {
        this.attackController(target);
    }
    else {
        this.travelTo(target);
    }
};
Creep.prototype.goMelee = function (target) {
    if (this.pos.inRangeTo(target.pos, RANGES.MELEE)) {
        this.attack(target);
    }
    else {
        this.travelTo(target);
    }
};
Creep.prototype.reassign = function (role, manager) {
    this.memory.role = role;
    this.memory.manager = manager.name;
};

class Mission {
    constructor(flag, empire) {
        var _a;
        this.scoutingNeeded = false;
        this.memory = flag.memory;
        this.flag = flag;
        this.name = flag.name + flag.pos.roomName;
        this.empire = empire;
        this.pos = flag.pos;
        this.room = flag.room;
        if (!this.memory.roomName) {
            this.memory.roomName = this.pos.roomName;
        }
        if (this.scoutingNeeded && this.capital) {
            Memory.capitals[this.capital.name].scoutTargets.push(this.pos.roomName);
        }
        this.capital = this.getCapital();
        (_a = this.capital) === null || _a === void 0 ? void 0 : _a.missions.push(this);
    }
    getCapital() {
        if (this.memory.capital) {
            return this.empire.capitals[this.memory.capital];
        }
        else {
            let nearestCapital = this.findClosestCapital();
            this.memory.capital = nearestCapital ? nearestCapital.name : undefined;
            return nearestCapital;
        }
    }
    findClosestCapital() {
        let nearestCapital;
        let minDistance = Infinity;
        for (let name in this.empire.capitals) {
            let capital = this.empire.capitals[name];
            let length = PathFinder.search(this.pos, capital.pos).path.length;
            if (length < minDistance && this.filter(capital)) {
                minDistance = length;
                nearestCapital = capital;
            }
        }
        return nearestCapital;
    }
}

class CreepSetup {
    constructor(role, bodysetup = {}) {
        _.defaults(bodysetup, {
            pattern: [],
            sizeLimit: Infinity,
            ordered: true,
        });
        this.role = role;
        this.bodySetup = bodysetup;
    }
    //Calculates how bit a creep can be, and returns it.
    getBodyPotential(partType, capital) {
        let energyCapacity = capital.room.energyCapacityAvailable;
        let body = this.generateBody(energyCapacity);
        return _.filter(body, (part) => part == partType).length;
    }
    generateBody(availableEnergy) {
        let patternCost, patternLength, numRepeats;
        let body = [];
        //calculate how big we can make a creep
        patternCost = bodyCost(this.bodySetup.pattern);
        patternLength = this.bodySetup.pattern.length;
        let energyLimit = Math.floor(availableEnergy / patternCost);
        let maxPartLimit = Math.floor(MAX_CREEP_SIZE / patternLength);
        numRepeats = Math.min(energyLimit, maxPartLimit, this.bodySetup.sizeLimit);
        if (this.bodySetup.ordered) { // repeated body pattern
            for (let part of this.bodySetup.pattern) {
                for (let i = 0; i < numRepeats; i++) {
                    body.push(part);
                }
            }
        }
        else {
            for (let i = 0; i < numRepeats; i++) {
                body = body.concat(this.bodySetup.pattern);
            }
        }
        return body;
    }
}
//Calculates cost of a body
function bodyCost(bodyparts) {
    return _.sum(bodyparts, part => BODYPART_COST[part]);
}

const Roles = {
    // Civilian roles
    drone: 'drone',
    van: 'van',
    settler: 'settler',
    colonist: 'colonist',
    treasurer: 'treasurer',
    queen: 'queen',
    charger: "charger",
    scout: 'scout',
    lorry: 'lorry',
    worker: 'worker',
    upgrader: 'upgrader',
    // Combat roles
    guardMelee: 'guardsman',
    melee: 'assault marine',
    ranged: 'devastator',
    healer: 'chaplain',
    dismantler: 'sapper',
};
const Setups = {
    drones: {
        extractor: new CreepSetup(Roles.drone, {
            pattern: [WORK, WORK, CARRY, MOVE],
            sizeLimit: Infinity,
        }),
        miners: {
            default: new CreepSetup(Roles.drone, {
                pattern: [WORK, WORK, CARRY, MOVE],
                sizeLimit: 3,
            }),
            standard: new CreepSetup(Roles.drone, {
                pattern: [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE],
                sizeLimit: 1,
            }),
            early: new CreepSetup(Roles.drone, {
                pattern: [WORK, WORK, CARRY, MOVE],
                sizeLimit: 2,
            }),
            emergency: new CreepSetup(Roles.drone, {
                pattern: [WORK, WORK, CARRY, MOVE],
                sizeLimit: 1,
            }),
            double: new CreepSetup(Roles.drone, {
                pattern: [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE],
                sizeLimit: 2,
            }),
            sourceKeeper: new CreepSetup(Roles.drone, {
                pattern: [WORK, WORK, CARRY, MOVE],
                sizeLimit: 5,
            })
        }
    },
    van: new CreepSetup(Roles.van, {
        pattern: [CARRY, CARRY, MOVE],
        sizeLimit: 1,
    }),
    colonisers: {
        settler: new CreepSetup(Roles.settler, {
            pattern: [CLAIM, MOVE],
            sizeLimit: 1
        }),
        reserve: new CreepSetup(Roles.settler, {
            pattern: [CLAIM, MOVE],
            sizeLimit: 4,
        }),
        controllerAttacker: new CreepSetup(Roles.settler, {
            pattern: [CLAIM, MOVE],
            sizeLimit: Infinity,
        }),
    },
    colonist: new CreepSetup(Roles.colonist, {
        pattern: [WORK, CARRY, MOVE, MOVE],
        sizeLimit: Infinity,
    }),
    treasurers: {
        default: new CreepSetup(Roles.treasurer, {
            pattern: [CARRY, CARRY, CARRY, CARRY, MOVE],
            sizeLimit: 3,
        }),
        stationary: new CreepSetup(Roles.treasurer, {
            pattern: [CARRY, CARRY],
            sizeLimit: 8,
        }),
        stationary_work: new CreepSetup(Roles.treasurer, {
            pattern: [WORK, WORK, WORK, WORK, CARRY, CARRY],
            sizeLimit: 8,
        }),
    },
    queens: {
        default: new CreepSetup(Roles.queen, {
            pattern: [CARRY, CARRY, MOVE],
            sizeLimit: Infinity,
        }),
        early: new CreepSetup(Roles.queen, {
            pattern: [CARRY, MOVE],
            sizeLimit: Infinity,
        }),
    },
    chargers: {
        default: new CreepSetup(Roles.charger, {
            pattern: [CARRY, CARRY, MOVE],
            sizeLimit: Infinity,
        }),
        early: new CreepSetup(Roles.queen, {
            pattern: [CARRY, CARRY, MOVE],
            sizeLimit: 2,
        }),
    },
    scout: new CreepSetup(Roles.scout, {
        pattern: [MOVE],
        sizeLimit: 1,
    }),
    lorrys: {
        default: new CreepSetup(Roles.lorry, {
            pattern: [CARRY, CARRY, MOVE],
            sizeLimit: Infinity,
        }),
        early: new CreepSetup(Roles.lorry, {
            pattern: [CARRY, MOVE],
            sizeLimit: Infinity,
        }),
    },
    workers: {
        default: new CreepSetup(Roles.worker, {
            pattern: [WORK, CARRY, MOVE],
            sizeLimit: Infinity,
        }),
        early: new CreepSetup(Roles.worker, {
            pattern: [WORK, CARRY, MOVE, MOVE],
            sizeLimit: Infinity,
        }),
    },
    upgraders: {
        default: new CreepSetup(Roles.upgrader, {
            pattern: [WORK, WORK, WORK, CARRY, MOVE],
            sizeLimit: Infinity,
        }),
        rcl8: new CreepSetup(Roles.upgrader, {
            pattern: [WORK, WORK, WORK, CARRY, MOVE],
            sizeLimit: 5,
        }),
    },
    guards: {
        armored: new CreepSetup(Roles.guardMelee, {
            pattern: [TOUGH, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE],
            sizeLimit: Infinity,
        }),
    },
};

class Manager {
    constructor(initialiser, name, priority) {
        //info from initialiser
        this.name = name;
        this.room = Game.rooms[initialiser.pos.roomName];
        this.capital = initialiser.capital;
        this.priority = priority;
        this.pos = initialiser.pos;
        //Get list of my creeps from capital and group them by role
        this.creeps = this.capital.creepsByManager[this.name] || [];
        this.creepsByRole = _.groupBy(this.creeps, r => r.memory.role);
        this.capital.managers.push(this);
    }
    //Used for spawning logic. Takes a list of currently alive creeps and removes those that will be dead soon.
    //Used to calculate number of creeps needed, ignoring those that are nearly dead
    //TODO could maybe calculate move speed but that's a massive pain
    filterLife(creeps, prespawn = 50) {
        let distance = 0;
        if (this.capital.spawns[0]) {
            distance = this.pos ? PathFinder.search(this.pos, this.capital.barracks.pos, { maxOps: 4000 }).cost || 0 : 0;
        }
        return _.filter(creeps, creep => creep.ticksToLive > CREEP_SPAWN_TIME * creep.body.length + distance + prespawn || creep.spawning || (!creep.spawning && !creep.ticksToLive));
    }
    //request a certain number of creeps! Will check currently existing creeps then add to queue based on manager
    //priority
    //REMEMBER TO NOT TRY THIS IF NO BARRACKS
    spawnList(quantity, setup, opts = {}) {
        //if not defined, use these options.
        _.defaults(opts, { priority: this.priority, prespawn: config.spawning.prespawn });
        let current = this.filterLife(this.creepsByRole[setup.role] || [], opts.prespawn).length;
        let needed = quantity - current;
        if (needed > 50) {
            console.log("too many requests from: ", this.name, "FIX now");
        }
        for (let i = 0; i < needed; i++) {
            this.requestCreep(setup, opts);
        }
    }
    //Adds a creep to the queue of the barracks. Ideally wishlist will be used to call this, but direct calls are technically allowed
    //if needed
    requestCreep(setup, opts) {
        _.defaults(opts, { priority: this.priority, prespawn: 50 });
        //console.log("requesting creep " + setup.role)
        if (this.capital.barracks) {
            this.capital.barracks.addToQueue(setup, this, opts);
        }
    }
}

const ManagerPriority = {
    Crisis: {
        mini: 0,
    },
    //Necessary for capitals to function
    Core: {
        queen: 100,
        charger: 100,
        treasurer: 101,
    },
    Defense: {
        melee: 200,
        ranged: 201,
    },
    //Managers beyond this point are non essential to the survival of the capital
    Offense: {},
    Colonization: {
        claim: 400,
        pioneer: 401,
    },
    Capital: {
        firstTransport: 500,
        miner: 501,
        work: 502,
        mineralRCL8: 503,
        transport: 510,
        mineral: 520
    },
    OutpostDefense: {
        outpostDefense: 600,
        guard: 601,
    },
    Upgrading: {
        upgrade: 700,
    },
    HaulUrgent: {
        haul: 800,
    },
    Scouting: {
        stationary: 900,
        random: 901,
    },
    Outpost: {
        reserve: 1000,
        mine: 1001,
        increment: 5,
    },
    SKOutpost: {
    //TODO
    },
    Lorry: {
        lorry: 1200
    }
};

class SettleManager extends Manager {
    constructor(mission, prio = ManagerPriority.Colonization.claim) {
        super(mission.capital, "SettleManager_" + mission.name, prio);
        this.mission = mission;
        this.room = this.mission.room;
        this.controller = this.room ? this.room.controller : undefined;
        this.claimers = this.creepsByRole[Roles.settler];
    }
    handleClaimer(claimer) {
        if (this.controller && claimer.room == this.controller.room) {
            claimer.goClaim(this.controller);
            claimer.say("CLAIMING");
        }
        else if (this.controller && this.controller.owner) {
            claimer.goAttackController(this.controller);
        }
        else {
            claimer.say("Moving");
            claimer.travelTo(this.mission.pos, { allowHostile: true, allowSK: true, maxRooms: 500, ensurePath: true });
        }
    }
    init() {
        this.spawnList(1, Setups.colonisers.settler);
    }
    run() {
        _.forEach(this.claimers, r => this.handleClaimer(r));
    }
}

class SettleMission extends Mission {
    constructor(flag, empire) {
        super(flag, empire);
        this.scoutingNeeded = true;
        this.controller = this.room ? this.room.controller : undefined;
        if (this.capital) {
            this.manager = new SettleManager(this);
        }
    }
    filter(capital) {
        return capital.barracks ? capital.level >= 5 : false;
    }
    init() {
        if (this.controller && this.controller.my) {
            console.log("removing settler flag");
            this.flag.setColor(COLOR_GREEN, COLOR_RED);
            Memory.capitals[this.pos.roomName] = {
                outposts: [],
                isBunker: true,
                scoutTargets: [],
                anchor: this.pos
            };
        }
    }
    run() {
    }
}

class SetupManager extends Manager {
    constructor(mission, prio = ManagerPriority.Colonization.pioneer) {
        super(mission.capital, "SetupManager_" + mission.name, prio);
        this.barrierHits = {
            1: 3e+3,
            2: 3e+3,
            3: 1e+4,
            4: 5e+4,
            5: 1e+5,
            6: 5e+5,
            7: 1e+6,
            //8       : 1e+6,
            8: 2e+7,
        };
        this.critical = 2500;
        this.tolerance = 100000;
        this.fortifyThreshold = 500000;
        this.mission = mission;
        this.pioneers = this.creepsByRole[Roles.colonist] || [];
        this.setup = Setups.colonist;
        this.room = mission.room;
        this.hostileStructs = this.room.find(FIND_HOSTILE_STRUCTURES);
        this.hostileSpawns = _.filter(this.hostileStructs, r => r.structureType == STRUCTURE_SPAWN);
        this.hitsGoal = this.barrierHits[this.capital.level];
        this.fortifyTargets = [];
        this.criticalTargets = _.filter(this.fortifyTargets, r => r.hits < this.critical);
        this.repairTargets = _.filter(_.compact(this.room.repairables), r => r.hits < 0.8 * r.hitsMax);
        this.constructionSites = this.room.constructionSites;
        this.deconstructTargets = this.hostileSpawns;
    }
    handlePioneer(pioneer) {
        if (pioneer.room != this.mission.flag.room) {
            pioneer.travelTo(this.mission.flag, { allowHostile: true, allowSK: true, maxRooms: 500, ensurePath: true });
            return;
        }
        let source = pioneer.pos.findClosestByPath(_.filter(this.room.sources, r => r.energy > 0));
        let distance = source ? pioneer.pos.getMultiRoomRangeTo(source.pos) : Infinity;
        if (this.deconstructTargets.length > 0) {
            if (this.deconstructActions(pioneer)) {
                pioneer.say("Deconstructing!");
                return;
            }
        }
        let drops = _.filter(pioneer.room.droppedEnergy, r => r.amount >= pioneer.store.getCapacity() / 4);
        let structs = _.filter(pioneer.room.storageUnits, r => r.store.energy >= pioneer.store.getCapacity() / 4);
        let targets = _.merge(drops, structs);
        //console.log(JSON.stringify(this.room.drops))
        let target = pioneer.pos.findClosestByMultiRoomRange(targets);
        if (target && pioneer.store.getUsedCapacity() == 0) {
            pioneer.goWithdraw(target);
        }
        else {
            if (distance <= 1 && pioneer.store.getFreeCapacity() > 0) {
                pioneer.say("I mine");
                pioneer.goHarvest(source);
            }
            else if (pioneer.store.getUsedCapacity() == 0) {
                pioneer.say("I go");
                if (source) {
                    pioneer.goHarvest(source, { ensurePath: true, repath: 3 });
                }
            }
            else {
                this.workActions(pioneer);
            }
        }
    }
    workActions(pioneer) {
        if (this.capital.controller.ticksToDowngrade <= (this.capital.level >= 4 ? 8000 : 2000)) {
            if (this.upgradeActions(pioneer)) {
                pioneer.say("Upgrading!");
                return;
            }
        }
        // Fortify critical barriers
        if (this.criticalTargets.length > 0) {
            if (this.fortifyActions(pioneer, this.criticalTargets)) {
                pioneer.say("Fortifying!");
                return;
            }
        }
        // Build new structures
        if (this.constructionSites.length > 0) {
            if (this.buildActions(pioneer)) {
                pioneer.say("Building!");
                return;
            }
        }
        if (this.fortifyTargets.length > 0) {
            if (this.fortifyActions(pioneer, this.fortifyTargets)) {
                pioneer.say("Fortifying!");
                return;
            }
        }
        if (this.repairTargets.length > 0) {
            if (this.repairActions(pioneer)) {
                pioneer.say("Repairing!");
                return;
            }
        }
        else {
            if (this.upgradeActions(pioneer)) {
                pioneer.say("Upgrading!");
                return;
            }
        }
    }
    buildActions(worker) {
        let target = worker.pos.findClosestByMultiRoomRange(this.constructionSites);
        if (target) {
            worker.goBuild(target);
            return true;
        }
        return false;
    }
    deconstructActions(worker) {
        let target = worker.pos.findClosestByMultiRoomRange(this.deconstructTargets);
        if (target) {
            worker.goDeconstruct(target);
            return true;
        }
        return false;
    }
    repairActions(worker) {
        let target = worker.pos.findClosestByMultiRoomRange(this.repairTargets);
        if (target) {
            worker.goRepair(target);
            return true;
        }
        return false;
    }
    fortifyActions(worker, targets) {
        if (targets.length == 0) {
            return false;
        }
        let lowTargets;
        let lowestHits = _.min(_.map(targets, r => r.hits));
        lowTargets = _.take(_.filter(targets, r => r.hits <= lowestHits + this.tolerance), 5);
        let target = worker.pos.findClosestByPath(lowTargets);
        if (target) {
            worker.goRepair(target);
            return true;
        }
        return false;
    }
    upgradeActions(worker) {
        var _a;
        let target = worker.room.controller;
        if (!(((_a = worker.room.controller.sign) === null || _a === void 0 ? void 0 : _a.text) == config.signature)) {
            worker.goSign(worker.room.controller);
            return true;
        }
        else {
            worker.goUpgrade(target);
            return true;
        }
    }
    init() {
        console.log(this.name, "REQUESTING SETUP CREEPS FROM ", this.capital.name, "current: ", this.pioneers.length);
        this.spawnList(2, this.setup);
    }
    run() {
        _.forEach(this.pioneers, r => this.handlePioneer(r));
    }
}

class SetupMission extends Mission {
    constructor(flag, empire) {
        var _a;
        super(flag, empire);
        //console.log("hi")
        //console.log(this.capital?.room)
        if (this.room && this.capital) {
            this.manager = new SetupManager(this);
            this.controller = this.room.controller;
        }
        else if (this.capital && this.memory.roomName) {
            (_a = this.capital.observer) === null || _a === void 0 ? void 0 : _a.observeRoom(this.memory.roomName);
        }
    }
    filter(capital) {
        return capital.barracks ? capital.level >= 5 : false;
    }
    init() {
        if (this.room && this.room.spawns.length >= 1 && this.controller.level >= 4) {
            this.flag.remove();
        }
    }
    run() {
    }
}

function createMission(flag, empire) {
    switch (flag.color) {
        //Green primary is used for missions on new rooms
        case COLOR_GREEN:
            switch (flag.secondaryColor) {
                case COLOR_GREEN:
                    return new SettleMission(flag, empire);
                case COLOR_RED:
                    return new SetupMission(flag, empire);
            }
            break;
    }
    return undefined;
}

function maxBy(objects, iteratee) {
    let maxObj;
    let maxVal = -Infinity;
    let val;
    for (const i in objects) {
        val = iteratee(objects[i]);
        if (val !== false && val > maxVal) {
            maxVal = val;
            maxObj = objects[i];
        }
    }
    return maxObj;
}
function minBy(objects, iteratee) {
    let minObj;
    let minVal = Infinity;
    let val;
    for (const i in objects) {
        val = iteratee(objects[i]);
        if (val !== false && val < minVal) {
            minVal = val;
            minObj = objects[i];
        }
    }
    return minObj;
}
Object.defineProperty(Source.prototype, "name", {
    get() {
        return this.id;
    }
});
Object.defineProperty(StructureController.prototype, "name", {
    get() {
        return this.id;
    }
});
Object.defineProperty(StructureStorage.prototype, "energy", {
    get() {
        return this.store.energy;
    }
});
Object.defineProperty(StructureStorage.prototype, "energyCapacity", {
    get() {
        return this.store.getCapacity();
    }
});
Object.defineProperty(StructureContainer.prototype, "energyCapacity", {
    get() {
        return this.store.getCapacity();
    }
});
Object.defineProperty(StructureTerminal.prototype, "energyCapacity", {
    get() {
        return this.store.getCapacity();
    }
});
Object.defineProperty(StructureContainer.prototype, "energy", {
    get() {
        return this.store.energy;
    }
});
Object.defineProperty(StructureTerminal.prototype, "energy", {
    get() {
        return this.store.energy;
    }
});
global.derefRoomPosition = function (protoPos) {
    return new RoomPosition(protoPos.x, protoPos.y, protoPos.roomName);
};

class Building {
    constructor(capital, intstantiator) {
        this.capital = capital;
        this.room = intstantiator.room;
        this.pos = intstantiator.pos;
        this.capital.buildings.push(this);
    }
}

class Artillery extends Building {
    constructor(capital, tower) {
        super(capital, tower);
        this.towers = this.capital.towers;
        this.name = "Artillery_" + tower.id;
    }
    towerDamageAtPos(pos, ignoreEnergy = false) {
        let room = Game.rooms[pos.roomName];
        if (room) {
            let expectedDamage = 0;
            for (const tower of room.towers) {
                if (tower.energy > 0 || ignoreEnergy) {
                    expectedDamage += this.singleTowerDamage(pos.getRangeTo(tower));
                }
            }
            return expectedDamage;
        }
        else {
            return 0;
        }
    }
    singleTowerDamage(range) {
        if (range <= TOWER_OPTIMAL_RANGE) {
            return TOWER_POWER_ATTACK;
        }
        range = Math.min(range, TOWER_FALLOFF_RANGE);
        const falloff = (range - TOWER_OPTIMAL_RANGE) / (TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE);
        return TOWER_POWER_ATTACK * (1 - TOWER_FALLOFF * falloff);
    }
    attack(target) {
        _.forEach(this.towers, r => r.attack(target));
    }
    init() {
    }
    run() {
        if (this.room.hostiles.length > 0) {
            let target = maxBy(this.room.hostiles, r => this.towerDamageAtPos(r.pos));
            this.attack(target);
        }
        else {
            let healableCreeps = this.room.find(FIND_MY_CREEPS, { filter: r => r.hits < r.hitsMax });
            if (healableCreeps.length > 0) {
                _.forEach(this.towers, r => r.heal(healableCreeps[0]));
                return;
            }
            let criticalFortifications = _.filter(this.room.barriers, r => r.hits < 5000);
            if (criticalFortifications.length > 0) {
                _.forEach(this.towers, r => r.repair(criticalFortifications[0]));
                return;
            }
        }
    }
}

const baseAnchor = { "x": 25, "y": 25 };
function isSupplyStructure(structure) {
    return structure.structureType == STRUCTURE_EXTENSION
        || structure.structureType == STRUCTURE_TOWER
        || structure.structureType == STRUCTURE_SPAWN;
}
//A static class of bunker methods
class Bunker {
    static getRoomPosForBunkerCoord(bunkerCoord, anchor) {
        let dx = bunkerCoord.x - baseAnchor.x;
        let dy = bunkerCoord.y - baseAnchor.y;
        return new RoomPosition(anchor.x + dx, anchor.y + dy, anchor.roomName);
    }
    static getFillStructureAtPosition(pos) {
        let structs = pos.lookFor(LOOK_STRUCTURES);
        return _.filter(structs, r => r.structureType == STRUCTURE_EXTENSION || r.structureType == STRUCTURE_TOWER || r.structureType == STRUCTURE_SPAWN);
    }
    static getFillStructuresFromList(anchor, posList) {
        let structs = [];
        let positions = _.map(posList, r => Bunker.getRoomPosForBunkerCoord(r, anchor));
        for (const pos of positions) {
            const structure = _.find(pos.lookFor(LOOK_STRUCTURES), s => isSupplyStructure(s));
            if (structure) {
                structs.push(structure);
            }
        }
        return structs;
    }
    static getSpawnAtPos(pos) {
        let structs = pos.lookFor(LOOK_STRUCTURES);
        return _.filter(structs, r => r.structureType == STRUCTURE_SPAWN);
    }
    static getSpawnsFromList(anchor, posList) {
        let structs = [];
        for (let pogPos of posList) {
            let pos = Bunker.getRoomPosForBunkerCoord(pogPos, anchor);
            structs.concat(Bunker.getSpawnAtPos(pos));
        }
        return structs;
    }
    static getPathFromList(anchor, path) {
        return _.map(path, r => Bunker.getRoomPosForBunkerCoord(r, anchor));
    }
}
Bunker.bunkerFillTargets = {
    //bottomLeft
    6: [{ "x": 22, "y": 24 }, { "x": 20, "y": 25 }, { "x": 21, "y": 25 }, { "x": 20, "y": 26 }, { "x": 22, "y": 26 }, { "x": 19, "y": 27 }, { "x": 21, "y": 27 }, { "x": 22, "y": 27 }, { "x": 19, "y": 28 }, { "x": 21, "y": 28 }, { "x": 22, "y": 28 }, { "x": 23, "y": 28 }, { "x": 24, "y": 28 }, { "x": 20, "y": 29 }, { "x": 22, "y": 29 }, { "x": 23, "y": 29 }, { "x": 25, "y": 29 }, { "x": 20, "y": 30 }, { "x": 21, "y": 30 }, { "x": 24, "y": 30 }, { "x": 25, "y": 30 }, { "x": 23, "y": 27 }, { "x": 25, "y": 26 }, { "x": 24, "y": 25 }, { "x": 23, "y": 25 }, { "x": 25, "y": 27 }],
    //topLeft
    8: [{ "x": 22, "y": 19 }, { "x": 23, "y": 19 }, { "x": 20, "y": 20 }, { "x": 21, "y": 20 }, { "x": 24, "y": 20 }, { "x": 20, "y": 21 }, { "x": 22, "y": 21 }, { "x": 23, "y": 21 }, { "x": 25, "y": 21 }, { "x": 19, "y": 22 }, { "x": 21, "y": 22 }, { "x": 22, "y": 22 }, { "x": 23, "y": 22 }, { "x": 24, "y": 22 }, { "x": 26, "y": 22 }, { "x": 19, "y": 23 }, { "x": 21, "y": 23 }, { "x": 22, "y": 23 }, { "x": 20, "y": 24 }, { "x": 22, "y": 24 }, { "x": 20, "y": 25 }, { "x": 21, "y": 25 }, { "x": 22, "y": 26 }, { "x": 23, "y": 23 }, { "x": 25, "y": 24 }, { "x": 24, "y": 25 }, { "x": 25, "y": 23 }, { "x": 23, "y": 25 }],
    //topRight
    2: [{ "x": 27, "y": 19 }, { "x": 28, "y": 19 }, { "x": 26, "y": 20 }, { "x": 29, "y": 20 }, { "x": 30, "y": 20 }, { "x": 25, "y": 21 }, { "x": 27, "y": 21 }, { "x": 28, "y": 21 }, { "x": 30, "y": 21 }, { "x": 24, "y": 22 }, { "x": 26, "y": 22 }, { "x": 27, "y": 22 }, { "x": 28, "y": 22 }, { "x": 29, "y": 22 }, { "x": 28, "y": 23 }, { "x": 29, "y": 23 }, { "x": 28, "y": 24 }, { "x": 30, "y": 24 }, { "x": 29, "y": 25 }, { "x": 30, "y": 25 }, { "x": 25, "y": 23 }, { "x": 27, "y": 23 }, { "x": 25, "y": 24 }, { "x": 27, "y": 25 }]
};
Bunker.bunkerPath = {
    //bottomLeft
    6: [{ "x": 24, "y": 26 }, { "x": 24, "y": 27 }, { "x": 25, "y": 28 }, { "x": 24, "y": 29 }, { "x": 23, "y": 30 }, { "x": 22, "y": 30 }, { "x": 21, "y": 29 }, { "x": 20, "y": 28 }, { "x": 20, "y": 27 }, { "x": 21, "y": 26 }, { "x": 22, "y": 25 }, { "x": 23, "y": 26 }, { "x": 24, "y": 26 }],
    //topLeft
    8: [{ "x": 24, "y": 24 }, { "x": 23, "y": 24 }, { "x": 22, "y": 25 }, { "x": 21, "y": 24 }, { "x": 20, "y": 23 }, { "x": 20, "y": 22 }, { "x": 21, "y": 21 }, { "x": 22, "y": 20 }, { "x": 23, "y": 20 }, { "x": 24, "y": 21 }, { "x": 25, "y": 22 }, { "x": 24, "y": 23 }, { "x": 24, "y": 24 }],
    //topRight
    2: [{ "x": 26, "y": 24 }, { "x": 26, "y": 23 }, { "x": 25, "y": 22 }, { "x": 26, "y": 21 }, { "x": 27, "y": 20 }, { "x": 28, "y": 20 }, { "x": 29, "y": 21 }, { "x": 30, "y": 22 }, { "x": 30, "y": 23 }, { "x": 29, "y": 24 }, { "x": 28, "y": 25 }, { "x": 27, "y": 24 }, { "x": 26, "y": 24 }],
};
Bunker.spawnTargets = {
    //bottomLeft
    6: [{ "x": 25, "y": 27 }, { "x": 23, "y": 25 }],
    //topLeft
    8: [{ "x": 23, "y": 25 }, { "x": 25, "y": 23 }],
    //topRight
    2: [{ "x": 25, "y": 23 }],
};

class ChargerManager extends Manager {
    constructor(capital, direction, prio = ManagerPriority.Core.charger) {
        let idle = capital.anchor.findPositionAtDirection(direction);
        super({ pos: idle, capital: capital }, "ChargerManager_" + capital.name + "_" + direction, prio);
        this.idlePoint = idle;
        this.setup = Setups.chargers.default;
        this.anchor = this.capital.anchor;
        this.chargers = this.creepsByRole[Roles.charger];
        this.path = Bunker.getPathFromList(this.anchor, Bunker.bunkerPath[direction]);
        this.fillTargets = _.filter(Bunker.getFillStructuresFromList(this.anchor, Bunker.bunkerFillTargets[direction]), r => r.store.energy < r.store.getCapacity(RESOURCE_ENERGY));
        this.spawns = Bunker.getSpawnsFromList(this.anchor, Bunker.spawnTargets[direction]);
    }
    idleActions(charger) {
        if (charger.store.energy < charger.store.getCapacity()) {
            charger.withdraw(this.capital.storage, RESOURCE_ENERGY);
        }
        else if (this.room.energyAvailable < this.room.energyCapacityAvailable || this.capital.towerNeedFilling) {
            let targets = charger.pos.findInRange(this.fillTargets, 1);
            //charger.say("" + targets.length)
            if (targets.length > 1) {
                charger.transfer(targets[0], RESOURCE_ENERGY);
                return;
            }
            else if (targets.length == 1) {
                charger.transfer(targets[0], RESOURCE_ENERGY);
            }
            else {
                charger.moveByPath(this.path);
                targets = charger.pos.findInRange(this.fillTargets, 1);
                if (targets.length > 0) {
                    charger.transfer(targets[0], RESOURCE_ENERGY);
                }
            }
        }
        else {
            charger.say("💤");
        }
    }
    travelActions(charger) {
        if (charger.store.energy == 0) {
            charger.moveByPath(this.path);
        }
        else {
            let targets = charger.pos.findInRange(this.fillTargets, 1);
            charger.say("🚬");
            if (targets.length > 1) {
                charger.transfer(targets[0], RESOURCE_ENERGY);
                return;
            }
            else if (targets.length == 1) {
                charger.transfer(targets[0], RESOURCE_ENERGY);
                charger.moveByPath(this.path);
            }
            else {
                charger.moveByPath(this.path);
            }
        }
    }
    handleCharger(charger) {
        if (charger.pos.isEqualTo(this.idlePoint)) {
            this.idleActions(charger);
        }
        else if (_.some(this.path, r => r.isEqualTo(charger.pos))) {
            this.travelActions(charger);
        }
        else {
            charger.say("🚬");
            charger.travelTo(this.idlePoint);
        }
    }
    init() {
        if (this.chargers && this.chargers.length == 0 && this.room.energyAvailable < 300) {
            this.spawnList(1, Setups.chargers.early, { prespawn: 100 });
        }
        else {
            let needed = (this.chargers && this.chargers[0] && this.chargers[0].body.length < 5) ? 2 : 1;
            this.spawnList(needed, this.setup);
        }
    }
    run() {
        var _a;
        _.forEach(this.chargers, r => this.handleCharger(r));
        if (this.chargers && this.chargers.length > 1 && !(_.some(this.chargers, r => r.spawning))) {
            (_a = minBy(this.filterLife(this.chargers), r => r.body.length)) === null || _a === void 0 ? void 0 : _a.suicide();
        }
    }
}

class QueenManager extends Manager {
    constructor(barracks, prio = ManagerPriority.Core.queen) {
        super(barracks, "QueenManager_" + barracks.coreSpawn.id, prio);
        this.refillTowersBelow = 500;
        this.barracks = barracks;
        this.room = barracks.room;
        this.queens = this.creepsByRole[Roles.queen];
        this.queenSetup = this.capital.storage ? Setups.queens.default : Setups.queens.early;
        this.targets = _.filter(this.barracks.energyStructures, r => r.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
        this.towers = _.filter(this.capital.towers, r => r.energy < r.energyCapacity);
        this.targets = this.targets.concat(this.towers);
    }
    handleQueen(queen) {
        if (queen.store.energy > 0) {
            queen.say("T");
            this.transferActions(queen);
        }
        else {
            queen.say("W");
            this.withdrawActions(queen);
        }
    }
    transferActions(queen) {
        const target = queen.pos.findClosestByPath(this.targets);
        if (target) {
            queen.goTransfer(target);
        }
        else {
            this.withdrawActions(queen);
        }
    }
    withdrawActions(queen) {
        const drops = _.filter(this.room.droppedEnergy, r => r.amount >= queen.store.getCapacity() / 2);
        const structs = _.filter(_.compact([this.capital.storage, this.capital.terminal, ...this.capital.containers]), r => r.store[RESOURCE_ENERGY] && r.store[RESOURCE_ENERGY] >= queen.store.getCapacity());
        const tombs = _.filter(this.capital.room.tombstones, r => r.store.energy > queen.store.getCapacity() / 4);
        let targets = [];
        targets = targets.concat(...drops, ...structs, ...tombs);
        //console.log(JSON.stringify(this.room.drops))
        const target = queen.pos.findClosestByPath(targets);
        if (target) {
            queen.goWithdraw(target);
        }
        else {
            queen.say("No target");
        }
    }
    init() {
        const pre = this.barracks.spawns.length <= 1 ? 100 : 50;
        this.spawnList(1, this.queenSetup, { prespawn: pre });
        if (this.queens && this.queens.length == 1 && this.queens[0].body.length < 5) {
            this.spawnList(2, this.queenSetup, { prespawn: pre });
        }
    }
    run() {
        _.forEach(this.queens, r => this.handleQueen(r));
    }
}

//Used to manage rooms that are just starting out. Uses miniminers and minilorrys to build stuffs
class CrisisManager extends Manager {
    constructor(barracks, prio = ManagerPriority.Crisis.mini) {
        super(barracks, "CrisisManager_" + barracks.coreSpawn.id, prio);
        this.room = barracks.room;
        console.log("CRISIS IN ROOM: " + this.room.name);
        this.lorrys = this.creepsByRole[Roles.van];
        this.withdraw = _.filter(_.compact([this.room.storage, this.room.terminal, ...this.room.containers, ...this.room.links]), r => r.store.energy > 0);
        this.targets = _.filter([...this.room.spawns, ...this.room.extensions], r => r.energy < r.energyCapacity);
    }
    spawnMiners() {
        let miningSites = _.filter(this.capital.miningSites, r => r.room == this.room); //only spawn miners for sources in the room
        if (this.capital.spawns[0]) {
            miningSites = _.sortBy(miningSites, site => site.pos.getRangeTo(this.capital.spawns[0])); //If we have a spawn, check the closest source first!
        }
        //for ease, we spawn high priority miners and palm them off to the mining managers
        let miningManagers = _.map(miningSites, r => r.manager); //get a list of managers
        for (let mineManager of miningManagers) {
            let currentMiners = this.filterLife(mineManager.miners);
            let partsNeeded = Math.ceil(SOURCE_ENERGY_CAPACITY / ENERGY_REGEN_TIME / HARVEST_POWER) + 1;
            let partsAssigned = _.sum(_.map(currentMiners, r => r.getActiveBodyparts(WORK)));
            if (partsAssigned < partsNeeded && currentMiners.length < mineManager.pos.getAdjacentPositions().length) {
                this.capital.barracks.addToQueue(Setups.drones.miners.emergency, mineManager, { priority: this.priority });
            }
        }
    }
    init() {
        var _a, _b;
        //spawn early miners if this is early capital and has none. return statement so no other higher prio
        //creeps are spawned
        if (this.capital.stage == CapitalSize.Town) {
            if (!this.capital.creepsByRole[Roles.drone] || this.capital.creepsByRole[Roles.drone].length == 0) {
                this.spawnMiners();
                return;
            }
        }
        //spawn a transport and reassign as queen if no queen
        if (((_a = this.capital.barracks) === null || _a === void 0 ? void 0 : _a.manager) instanceof QueenManager ? this.capital.creepsByRole[Roles.queen].length == 0 : this.capital.creepsByRole[Roles.charger].length < this.capital.barracks.chargerManagers.length) {
            let lorry = this.capital.creepsByRole[Roles.van];
            if (lorry[0]) {
                if (!this.capital.barracks.manager) {
                    let chargerManagers = (_b = this.capital.barracks) === null || _b === void 0 ? void 0 : _b.chargerManagers;
                    let target = _.first(_.filter(chargerManagers, r => !r.chargers || r.chargers.length == 0));
                    if (target) {
                        lorry[0].reassign(Roles.charger, target);
                    }
                    else {
                        lorry[0].suicide();
                    }
                }
                else {
                    lorry[0].reassign(Roles.queen, this.capital.barracks.manager);
                }
            }
            else {
                this.spawnList(1, Setups.van);
            }
        }
        //then! Spawn the rest of the miners needed if we don't have enough energy in room
        let roomEnergy = this.room.energyAvailable + _.sum(this.withdraw, r => r.store.energy || r.energy);
        let dropped = _.sum(this.room.droppedEnergy, r => r.amount);
        if (roomEnergy + dropped < config.crisis.emergencyMinersEnergyLimit && (!this.capital.creepsByRole[Roles.drone] || this.capital.creepsByRole[Roles.drone].length < 2)) {
            this.spawnMiners();
        }
    }
    run() {
    }
}

class DefenseManager extends Manager {
    constructor(barracks, prio = ManagerPriority.OutpostDefense.outpostDefense) {
        super(barracks, "DefenseManager_" + barracks.coreSpawn.id, prio);
        this.guards = this.creepsByRole[Roles.guardMelee];
        this.setup = Setups.guards.armored;
        this.targets = _.flatten(_.map(this.capital.allRooms, r => r.hostiles));
        this.invaderCore = _.flatten(_.map(this.capital.allRooms, r => r.find(FIND_HOSTILE_STRUCTURES, { filter: (s) => s.structureType == STRUCTURE_INVADER_CORE })));
        this.needed = this.targets.length + this.invaderCore.length;
    }
    handleGuard(guard) {
        let target = guard.pos.findClosestByMultiRoomRange(this.targets);
        if (target) {
            guard.goMelee(target);
        }
        else if (this.invaderCore[0]) {
            guard.goMelee(this.invaderCore[0]);
        }
        else {
            let spawn = guard.pos.findClosestByMultiRoomRange(this.capital.spawns);
            if (spawn && guard.pos.getMultiRoomRangeTo(spawn.pos) > 1) {
                guard.travelTo(spawn);
            }
            else if (spawn) {
                spawn.recycleCreep(guard);
            }
            else {
                guard.suicide();
            }
        }
    }
    init() {
        console.log("HOSTILES: ", this.needed);
        this.spawnList(this.needed, this.setup);
    }
    run() {
        _.forEach(this.guards, r => this.handleGuard(r));
    }
}

class Barracks extends Building {
    constructor(capital, mainSpawn) {
        super(capital, mainSpawn);
        this.chargerManagers = [];
        this.name = "Barracks_" + mainSpawn.id;
        this.spawns = this.capital.spawns;
        this.coreSpawn = this.capital.coreSpawn;
        this.availableSpawns = _.filter(this.spawns, r => !r.spawning);
        this.extensions = capital.extensions;
        this.energyStructures = _.sortBy([].concat(this.spawns, this.extensions), r => r.pos.getRangeTo(this.idlePos));
        this.productionPriorities = [];
        this.productionQueue = {};
        if (this.capital.anchor && this.capital.storage && this.capital.storage.store.energy > 2000) {
            this.chargerManagers.push(new ChargerManager(this.capital, BOTTOM_LEFT));
            if (this.extensions.length > 21) {
                this.chargerManagers.push(new ChargerManager(this.capital, TOP_LEFT));
            }
            if (this.extensions.length > 40) {
                this.chargerManagers.push(new ChargerManager(this.capital, TOP_RIGHT));
            }
        }
        else {
            this.manager = new QueenManager(this);
        }
        this.defenseManager = new DefenseManager(this);
        //Use a crisis manager if there is no queen and not enough energy to make one
        if (this.capital.room.energyAvailable < 1000 || (this.capital.creepsByRole[Roles.queen].length < 2 && this.capital.creepsByRole[Roles.charger].length < 3)) {
            this.crisisManager = new CrisisManager(this);
        }
    }
    //TODO MAKE A PROPER IDLE SPOT. HIGH PRIO
    get idlePos() {
        return this.spawns[0].pos.getAdjacentPositions()[0];
    }
    generateCreepName(roleName) {
        // Generate a creep name based on the role and add a hex id to make it unique
        let i = generateCreepID();
        while (Game.creeps[(roleName + '_' + i)]) {
            i = generateCreepID();
        }
        return (roleName + '_' + i);
    }
    ;
    createSpawnOrder(setup, manager, opts) {
        const body = setup.generateBody(this.room.energyCapacityAvailable);
        const memory = {
            capital: manager.capital.name,
            manager: manager.name,
            role: setup.role,
            routing: null,
            task: null,
            recycle: false,
            killed: false,
            data: {},
            targetId: opts.targetId,
            state: opts.state,
        };
        const name = this.generateCreepName(setup.role);
        const order = {
            name,
            body,
            memory,
            options: opts
        };
        return order;
    }
    addToQueue(setup, manager, opts) {
        const request = this.createSpawnOrder(setup, manager, opts);
        const prio = request.options.priority;
        if (this.canSpawn(request.body) && request.body.length > 0) {
            if (!this.productionQueue[prio]) {
                this.productionQueue[prio] = [];
                this.productionPriorities.push(prio);
            }
            this.productionQueue[prio].push(request);
        }
        else {
            console.log("cannot spawn " + setup.role + " for " + manager + request.body);
            console.log(request.body.length);
            console.log(this.canSpawn(request.body));
        }
    }
    canSpawn(body) {
        return bodyCost(body) <= this.room.energyCapacityAvailable;
    }
    spawnHighestPriorityCreep() {
        const sortedKeys = _.sortBy(this.productionPriorities); //Sort prio list
        for (const prio of sortedKeys) {
            const nextOrder = this.productionQueue[prio].shift();
            if (nextOrder) {
                const res = this.spawnCreep(nextOrder);
                if (res == OK || res == ERR_BUSY) {
                    return res;
                }
                else {
                    if (res != ERR_NOT_ENOUGH_ENERGY) {
                        //this.productionQueue[prio].unshift(nextOrder)
                        return res;
                    }
                }
            }
        }
        return -66;
    }
    spawnCreep(request) {
        const body = request.body;
        const name = request.name;
        const memory = request.memory;
        const options = request.options;
        let spawnToUse;
        if (request.options.spawn) {
            spawnToUse = request.options.spawn;
            if (spawnToUse.spawning) {
                return ERR_BUSY;
            }
            else {
                _.remove(this.availableSpawns, spawn => spawn.id == spawnToUse.id); // mark as used
            }
        }
        else {
            spawnToUse = this.availableSpawns.shift(); //remove spawn to be used from the list
        }
        if (spawnToUse) {
            if (bodyCost(body) > this.room.energyCapacityAvailable) {
                return ERR_NOT_ENOUGH_ENERGY;
            }
            memory.data.origin = spawnToUse.pos.roomName;
            const res = spawnToUse.spawnCreep(body, name, {
                memory,
                directions: options.directions,
            });
            if (res == OK) {
                return res;
            }
            else {
                this.availableSpawns.unshift(spawnToUse); //return spawn to stack if spawn unsuccessful
                return res;
            }
        }
        else {
            return ERR_BUSY;
        }
    }
    handleSpawns() {
        let res = 0;
        while (this.availableSpawns.length > 0 && res != -66) {
            res = this.spawnHighestPriorityCreep();
        }
        //TODO Clear the exit position of spawns if a creep is about to spawn
    }
    init() {
    }
    run() {
        console.log(this.room.name, "-------", _.map(this.productionQueue, r => _.map(r, t => t.name)));
        this.handleSpawns();
    }
}
function generateCreepID() {
    const hex = '0123456789ABCDEF';
    let creepID = '';
    for (let i = 0; i < 4; i++) {
        creepID += hex.charAt(Math.floor(Math.random() * hex.length));
    }
    return creepID;
}

const MINER_COST$1 = bodyCost(Setups.drones.miners.standard.generateBody(Infinity));
const DOUBLE_COST$1 = bodyCost(Setups.drones.miners.double.generateBody(Infinity));
class ExtractorManager extends Manager {
    constructor(extractorSite, priority = ManagerPriority.Capital.miner) {
        var _a;
        super(extractorSite, "ExtractorManager_" + extractorSite.mineral.id, priority);
        this.room = extractorSite.room;
        this.site = extractorSite;
        this.container = this.site.container;
        this.link = this.site.link || undefined;
        this.miners = this.creepsByRole[Roles.drone];
        this.mineral = this.site.mineral;
        this.extractor = this.site.extractor;
        this.constructionSite = _.first(this.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 2));
        this.energyPerTick = Math.max(_.sum(this.miners, r => r.getActiveBodyparts(WORK) * 2), Math.ceil((((_a = this.container) === null || _a === void 0 ? void 0 : _a.store.getUsedCapacity()) || 0) / 500));
        if (this.container) {
            this.harvestPos = this.container.pos;
        }
    }
    //calculates where the container should be put. If no barracks, just return the source position for miners to move to
    calculateContainerPos() {
        return _.first(this.site.mineral.pos.getAdjacentPositions());
    }
    addContainer() {
        if (!this.container && !this.constructionSite && this.capital.level >= 6) {
            let res = this.calculateContainerPos().createConstructionSite(STRUCTURE_CONTAINER);
            if (res != OK) {
            }
        }
    }
    addExtractor() {
        if (!this.extractor && !this.constructionSite) {
            let res = this.pos.createConstructionSite(STRUCTURE_EXTRACTOR);
        }
    }
    handleMiner(miner) {
        if (this.mineral.mineralAmount > 0 && this.container) {
            if (!(miner.pos.inRangeTo(this.container.pos, 0))) {
                miner.travelTo(this.container.pos);
            }
            else if (Game.time % EXTRACTOR_COOLDOWN == 0) {
                miner.harvest(this.mineral);
            }
        }
        else {
            let spawn = miner.pos.findClosestByMultiRoomRange(this.capital.spawns);
            if (spawn && miner.pos.getMultiRoomRangeTo(spawn.pos) > 1) {
                miner.travelTo(spawn);
            }
            else if (spawn) {
                spawn.recycleCreep(miner);
            }
            else {
                miner.suicide();
            }
        }
    }
    init() {
        let setup = Setups.drones.extractor;
        if (this.container && this.extractor && this.room.hostiles.length == 0 && this.mineral.mineralAmount > 0) {
            this.spawnList(1, setup);
        }
    }
    run() {
        //console.log(JSON.stringify(this.miners))
        _.forEach(this.miners, r => this.handleMiner(r));
        if (this.room && Game.time % 20 == 0) {
            this.addContainer();
            this.addExtractor();
        }
        //console.log(this.mode)
        //console.log(JSON.stringify(this.container!.pos))
    }
}

class ExtractorSite extends Building {
    constructor(capital, mineral) {
        super(capital, mineral);
        this.mineral = mineral;
        this.name = "ExtractorSite_" + mineral.id;
        this.container = _.first(_.filter(this.pos.findInRange(FIND_STRUCTURES, 1), r => r.structureType == STRUCTURE_CONTAINER));
        this.extractor = _.first(_.filter(this.pos.findInRange(FIND_STRUCTURES, 1), r => r.structureType == STRUCTURE_EXTRACTOR));
        this.capital = capital;
        this.manager = new ExtractorManager(this);
        if (this.container) {
            this.capital.buildingsByContainer[this.container.id] = this;
        }
    }
    init() {
    }
    run() {
    }
}

const MINER_COST = bodyCost(Setups.drones.miners.standard.generateBody(Infinity));
const DOUBLE_COST = bodyCost(Setups.drones.miners.double.generateBody(Infinity));
class MiningManager extends Manager {
    constructor(miningSite, priority = ManagerPriority.Capital.miner) {
        super(miningSite, "MineManager_" + miningSite.source.id, priority);
        this.dropMineUntilRCL = 3;
        this.site = miningSite;
        this.container = this.site.container;
        this.link = this.site.link;
        this.constructionSite = _.first(this.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 2));
        this.extensions = this.site.extensions;
        this.extenstionsToFill = _.filter(this.extensions, r => r.store[RESOURCE_ENERGY] < r.store.getCapacity(RESOURCE_ENERGY));
        this.room = miningSite.room;
        this.source = miningSite.source;
        this.miners = this.creepsByRole[Roles.drone];
        if (this.room.controller && this.room.controller.my) {
            this.energyPerTick = SOURCE_ENERGY_CAPACITY / ENERGY_REGEN_TIME;
        }
        else {
            this.energyPerTick = SOURCE_ENERGY_NEUTRAL_CAPACITY / ENERGY_REGEN_TIME;
        }
        this.miningPowerNeeded = Math.ceil(this.energyPerTick / HARVEST_POWER) + 1;
        if (this.capital.room.energyCapacityAvailable < MINER_COST) {
            this.mode = "Early";
            this.setup = Setups.drones.miners.early;
        }
        else if (this.site.link) {
            this.mode = "Link";
            this.setup = Setups.drones.miners.default;
        }
        else {
            this.mode = "Standard";
            this.setup = Setups.drones.miners.default;
        } //TODO Add code for when we want double miners (saves cpu)
        this.minersNeeded = Math.min(this.source.pos.getAdjacentPositions(1, true).length, Math.ceil(this.miningPowerNeeded / (this.setup.getBodyPotential(WORK, this.capital))));
        this.isDropMining = this.capital.level < this.dropMineUntilRCL;
        if (this.mode != "Early" && !this.isDropMining) {
            if (this.container) {
                this.harvestPos = this.container.pos;
            }
            else if (this.link) {
                this.harvestPos = _.first(_.filter(this.source.pos.getAdjacentPositions(), r => r.getRangeTo(this.link) == 1));
            }
            else {
                this.harvestPos = this.calculateContainerPos();
            }
        }
    }
    //calculates where the container should be put. If no barracks, just return the source position for miners to move to
    calculateContainerPos() {
        return _.first(this.site.source.pos.getAdjacentPositions(1));
    }
    addContainer() {
        if (this.isDropMining) { //no container needed if we are still drop mining, not worth building one yet
            return;
        }
        if (!this.container && !this.constructionSite) {
            let res = this.calculateContainerPos().createConstructionSite(STRUCTURE_CONTAINER);
            if (res != OK) {
                console.log("No container could be built at " + JSON.stringify(this.calculateContainerPos()));
            }
        }
    }
    earlyMiner(miner) {
        if (miner.room != this.room) {
            miner.travelTo(this.pos, { range: 0 });
            return;
        }
        if (this.container) {
            if (this.pos.inRangeTo(this.site.pos, 1)) {
                miner.travelTo(this.site.pos);
            }
            if (this.container.hits < this.container.hitsMax && miner.store.energy >= Math.min(miner.carryCapacity, REPAIR_POWER * miner.getActiveBodyparts(WORK))) {
                miner.goRepair(this.container);
                return;
            }
            else {
                if (miner.store.getFreeCapacity() > 0) {
                    miner.goHarvest(this.site.source);
                    return;
                }
                else {
                    miner.goTransfer(this.container);
                    return;
                }
            }
        }
        if (this.constructionSite) {
            if (miner.store.energy >= Math.min(miner.carryCapacity, BUILD_POWER * miner.getActiveBodyparts(WORK))) {
                miner.goBuild(this.constructionSite);
                return;
            }
            else {
                miner.goHarvest(this.site.source);
                return;
            }
        }
        if (this.isDropMining) {
            miner.goHarvest(this.site.source);
            return;
        }
        return;
    }
    standardMiner(miner) {
        //console.log(JSON.stringify(this.harvestPos!))
        if (this.container) {
            if (!(miner.pos.getRangeTo(this.harvestPos) == 0)) {
                miner.travelTo(this.container.pos, { range: 0 });
            }
            else if (this.container.hits < this.container.hitsMax && miner.store.energy >= Math.min(miner.carryCapacity, REPAIR_POWER * miner.getActiveBodyparts(WORK))) {
                miner.repair(this.container);
                return;
            }
            else {
                if (this.extenstionsToFill.length > 0 && miner.store.energy > 50) {
                    miner.transfer(this.extenstionsToFill[0], RESOURCE_ENERGY);
                }
                miner.harvest(this.site.source);
                return;
            }
        }
        if (this.constructionSite) {
            if (miner.store.energy >= Math.min(miner.carryCapacity, BUILD_POWER * miner.getActiveBodyparts(WORK))) {
                miner.goBuild(this.constructionSite);
                return;
            }
            else {
                miner.goHarvest(this.site.source);
                return;
            }
        }
        if (this.isDropMining) {
            miner.goHarvest(this.site.source);
            return;
        }
        return;
    }
    handleMiner(miner) {
        if (this.mode == "Early") {
            if (!miner.pos.inRangeTo(this.pos, 1)) {
                miner.moveTo(this.pos);
            }
        }
        switch (this.mode) {
            case "Early":
                return this.earlyMiner(miner);
            case "Link":
                return; //this.linkMiner(miner); //TODO Link mining
            case "Standard":
                return this.standardMiner(miner);
            case "SK":
                return this.standardMiner(miner);
            case "Double":
                return this.standardMiner(miner);
        }
    }
    init() {
        if (this.room.hostiles.length == 0 || this.room == this.capital.room) {
            this.spawnList(this.minersNeeded, this.setup);
        }
    }
    run() {
        //console.log(JSON.stringify(this.miners))
        _.forEach(this.miners, r => this.handleMiner(r));
        if (this.room && Game.time % 20 == 0) {
            this.addContainer();
        }
        //console.log(this.mode)
        //console.log(JSON.stringify(this.container!.pos))
    }
}

class MiningSite extends Building {
    constructor(capital, source) {
        super(capital, source);
        this.source = source;
        this.name = "Mining_Site_" + source.id;
        this.container = _.first(_.filter(this.pos.findInRange(FIND_STRUCTURES, 1), r => r.structureType == STRUCTURE_CONTAINER));
        this.extensions = this.pos.findInRange(this.room.extensions, 2);
        this.capital = capital;
        this.manager = new MiningManager(this);
        this.link = _.first(_.filter(this.pos.findInRange(FIND_STRUCTURES, 2), r => r.structureType == STRUCTURE_LINK));
        if (this.container) {
            this.capital.buildingsByContainer[this.container.id] = this;
        }
    }
    init() {
    }
    run() {
    }
}

class UpgradeManager extends Manager {
    constructor(upgradeSite, prio = ManagerPriority.Upgrading.upgrade) {
        super(upgradeSite, "UpgradeManager_" + upgradeSite.controller.id, prio);
        this.controller = upgradeSite.controller;
        this.upgraders = this.creepsByRole[Roles.upgrader];
        this.upgradeSite = upgradeSite;
        this.room = upgradeSite.room;
        this.powerNeeded = this.upgraders && this.upgraders.length > 0 ? this.upgraders[0].getActiveBodyparts(WORK) : 0;
    }
    handleUpgrader(upgrader) {
        var _a;
        if (upgrader.store.energy > 0) {
            if (this.upgradeSite.link && this.upgradeSite.link.hits < this.upgradeSite.link.hitsMax) {
                upgrader.goRepair(this.upgradeSite.link);
                return;
            }
            if (this.upgradeSite.container && this.upgradeSite.container.hits < this.upgradeSite.container.hitsMax) {
                upgrader.goRepair(this.upgradeSite.container);
                return;
            }
            if (this.upgradeSite.constructionSite) {
                upgrader.goBuild(this.upgradeSite.constructionSite);
                return;
            }
            if (!(((_a = this.upgradeSite.controller.sign) === null || _a === void 0 ? void 0 : _a.text) == config.signature)) {
                upgrader.goSign(this.capital.controller);
                return;
            }
            upgrader.goUpgrade(this.upgradeSite.controller);
            return;
        }
        else {
            if (this.upgradeSite.link && this.upgradeSite.link.energy > 0) {
                upgrader.goWithdraw(this.upgradeSite.link);
                return;
            }
            else if (this.upgradeSite.container && this.upgradeSite.container.energy > 0) {
                upgrader.goWithdraw(this.upgradeSite.container);
                return;
            }
            else if (this.upgradeSite.container) {
                upgrader.travelTo(this.upgradeSite.container, { range: 0 });
                return;
            }
            else {
                let drops = _.filter(this.room.droppedEnergy, r => r.amount > upgrader.store.getCapacity() / 4);
                let structs = _.filter(this.capital.room.storageUnits, r => r.store.energy > upgrader.store.getCapacity() / 4);
                let targets = _.merge(drops, structs);
                //console.log(JSON.stringify(this.room.drops))
                let target = upgrader.pos.findClosestByRange(targets);
                if (target) {
                    upgrader.goWithdraw(target);
                }
                return;
            }
        }
    }
    init() {
        if (this.capital.level < 3 || !this.capital.storage) { // let workers upgrade early on until we have a storage
            return;
        }
        console.log(this.capital.assets[RESOURCE_ENERGY]);
        if ((this.capital.assets[RESOURCE_ENERGY] > 100000 || this.controller.ticksToDowngrade < 500) && (this.upgradeSite.container)) {
            let setup = this.capital.level == 8 ? Setups.upgraders.rcl8 : Setups.upgraders.default;
            if (this.capital.level == 8) {
                this.spawnList(1, setup);
                this.powerNeeded = 15;
            }
            else {
                let upgradePowerEach = setup.getBodyPotential(WORK, this.capital);
                let extra = Math.max(this.capital.assets[RESOURCE_ENERGY] - 80000, 0); // how much energy we have spare. 80k is cutoff point TODO add to config
                let upgradePartNeeded = Math.floor(extra / 10000); //How many parts to spawn TODO add to config
                if (extra > 800000) {
                    upgradePartNeeded *= 4; //MORE POWER if we have lots of energy lying around
                }
                else if (extra > 500000) {
                    upgradePartNeeded *= 2;
                }
                console.log(upgradePartNeeded);
                this.powerNeeded = upgradePartNeeded;
                const upgradersNeeded = Math.ceil(upgradePartNeeded / upgradePowerEach);
                this.spawnList(upgradersNeeded, setup);
            }
            this.powerNeeded += 1;
        }
    }
    run() {
        _.forEach(this.upgraders, r => this.handleUpgrader(r));
    }
}

class UpgradeSite extends Building {
    constructor(capital, controller) {
        super(capital, controller);
        this.controller = controller;
        this.name = "UpgradeSite_" + controller.name;
        this.manager = new UpgradeManager(this);
        this.capital = capital;
        this.container = _.first(_.filter(this.pos.findInRange(FIND_STRUCTURES, 2), r => r.structureType == STRUCTURE_CONTAINER));
        this.link = _.first(_.filter(this.pos.findInRange(FIND_STRUCTURES, 2), r => r.structureType == STRUCTURE_LINK));
        this.constructionSite = _.first(this.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 2));
        if (this.container) {
            this.capital.buildingsByContainer[this.container.id] = this;
        }
    }
    buildContainerOrLink(type) {
        console.log("REEEE" + this.room.name);
        if (this.link || this.container) { //Just in case we accidentally call this when we have a link already
            return;
        }
        else { //finds the position 2 away with most adjacent spots to make pathing easier
            let possiblePos = this.controller.pos.getAdjacentPositions(2);
            let finalPos = maxBy(possiblePos, r => r.getAdjacentPositions().length);
            finalPos.createConstructionSite(type);
        }
    }
    init() {
    }
    run() {
        if (this.room && Game.time % 7 == 0 && this.capital.level >= 3 && this.capital.storage) {
            this.buildContainerOrLink(STRUCTURE_CONTAINER);
        }
    }
}

/**
 * This manager handles long range hauls for the capital. For intercapital trading, use a mission instead
 * This also moves energy between containers and the storage in reserved rooms
 *
 * Damn after 30 minutes thinking in the shower, this code is so much nicer wtf was I thinking before
 * TODO replace with a request system
 *
 */
class LorryManager extends Manager {
    constructor(hq, prio = ManagerPriority.Lorry.lorry) {
        super(hq, "LorryManager" + hq.storage.id, prio);
        this.lorryHQ = hq;
        this.lorrys = this.creepsByRole[Roles.lorry] || [];
        this.bunkerStorage = this.lorryHQ.storage;
        this.bunkerTerminal = this.lorryHQ.terminal;
        this.setup = Setups.lorrys.early;
        this.powerPer = this.setup.getBodyPotential(CARRY, this.capital);
        this.sites = [];
        this.sites = this.sites.concat(this.capital.miningSites);
        this.sites = this.sites.concat(this.capital.upgradeSite);
        this.sites = this.sites.concat(this.capital.extractorSites);
        this.sites = _.compact(this.sites);
        this.room = hq.room;
    }
    grabInputs() {
        let inputsList = [];
        _.forEach(this.capital.miningSites, r => inputsList.push(r.container));
        let newList = _.compact(inputsList);
        return _.sortBy(newList, r => this.getAmount(r));
    }
    grabOutputs() {
        let outputsList = [];
        outputsList.push(this.capital.upgradeSite.container);
        let newList = _.compact(outputsList);
        return _.filter(newList, r => r.energy < r.energyCapacity);
    }
    getAmount(ori) {
        if (ori instanceof StructureContainer) {
            return ori.store.energy;
        }
        else if (ori instanceof Resource) {
            return ori.amount;
        }
        else {
            return 0;
        }
    }
    transporterSizePerSite(site) {
        if (site instanceof UpgradeSite) {
            return Math.ceil(UPGRADE_CONTROLLER_POWER * site.manager.powerNeeded * 3 * PathFinder.search(this.lorryHQ.pos, site.pos).cost / CARRY_CAPACITY);
        }
        else if (site instanceof ExtractorSite) {
            return Math.min(Math.ceil(site.manager.energyPerTick * 3 * PathFinder.search(this.lorryHQ.pos, site.pos).cost / CARRY_CAPACITY / 5), 20);
        }
        else {
            return Math.ceil(site.manager.energyPerTick * 3 * PathFinder.search(this.lorryHQ.pos, site.pos).cost / CARRY_CAPACITY);
        }
    }
    handleLorry(lorry) {
        var _a;
        switch (lorry.memory.state) {
            case "withdraw":
                let target = Game.getObjectById(lorry.memory.targetId);
                let type = target instanceof StructureContainer ? _.first(_.keys(target.store)) : RESOURCE_ENERGY;
                if (target && lorry.store.getUsedCapacity() == 0) {
                    let site = this.capital.buildingsByContainer[lorry.memory.targetId];
                    if (site && site instanceof ExtractorSite) {
                        if (((_a = site.container) === null || _a === void 0 ? void 0 : _a.store.getUsedCapacity()) == 0 && site.mineral.mineralAmount == 0) {
                            let spawn = lorry.pos.findClosestByMultiRoomRange(this.capital.spawns);
                            if (spawn && lorry.pos.getMultiRoomRangeTo(spawn.pos) > 1) {
                                lorry.travelTo(spawn);
                            }
                            else if (spawn) {
                                spawn.recycleCreep(lorry);
                            }
                            else {
                                lorry.suicide();
                            }
                            return;
                        }
                    }
                    lorry.goWithdraw(target, type);
                    return;
                }
                else if (target) {
                    let bunkerTarget = (this.bunkerStorage.store.getFreeCapacity() < STORAGE_CAPACITY * 0.1 && this.bunkerTerminal) ? this.bunkerTerminal : this.bunkerStorage;
                    lorry.goTransfer(bunkerTarget);
                }
                else {
                    this.noTargetActions(lorry);
                }
                return;
            case "transfer":
                let transTarget = Game.getObjectById(lorry.memory.targetId);
                if (lorry.store.getFreeCapacity() == 0 && transTarget) {
                    lorry.goTransfer(transTarget);
                }
                else if (transTarget) {
                    lorry.goWithdraw(this.bunkerStorage);
                }
                else {
                    this.noTargetActions(lorry);
                }
                return;
            default:
                lorry.say("No state, suiciding");
                lorry.suicide();
                return;
        }
    }
    noTargetActions(lorry) {
        if (lorry.store.getUsedCapacity() == 0) {
            let drop = lorry.pos.findClosestByMultiRoomRange(this.room.allDrops);
            if (drop) {
                lorry.goWithdraw(drop);
            }
            else {
                lorry.say("No target and no drops, suiciding");
                lorry.suicide();
            }
        }
        else {
            _.forEach(_.keys(lorry.store), r => lorry.goTransfer(this.bunkerStorage, r));
        }
    }
    init() {
        var _a, _b, _c;
        for (let site of this.sites) {
            if (site.container && site.room.hostiles.length == 0) {
                let targetTotal = this.transporterSizePerSite(site);
                let current = this.filterLife(_.filter(this.lorrys, r => r.memory.targetId == site.container.id));
                let currentSize = _.sum(current, r => r.getActiveBodyparts(CARRY));
                let maxSize = this.powerPer;
                if (targetTotal > currentSize) {
                    let numNeeded = 1;
                    let state = site instanceof MiningSite || site instanceof ExtractorSite ? "withdraw" : "transfer";
                    let sizeNeeded = targetTotal;
                    if (maxSize > targetTotal) {
                        numNeeded = Math.ceil(targetTotal / maxSize);
                        sizeNeeded = Math.ceil(targetTotal / numNeeded);
                    }
                    //console.log(numNeeded, ", ", sizeNeeded)
                    let setup = new CreepSetup(Roles.lorry, { pattern: [CARRY, MOVE], sizeLimit: sizeNeeded, });
                    (_a = this.capital.barracks) === null || _a === void 0 ? void 0 : _a.addToQueue(setup, this, { priority: ManagerPriority.Lorry.lorry, targetId: (_b = site.container) === null || _b === void 0 ? void 0 : _b.id, state: state });
                    /*
                    let size = Math.min(targetTotal - currentSize, maxSize);
                    let state: "withdraw" | "transfer" | undefined = site instanceof MiningSite ? "withdraw" : "transfer";
                    let setup = new CreepSetup(Roles.lorry, {pattern  : [CARRY, MOVE], sizeLimit: size,})
                    this.capital.barracks?.addToQueue(setup, this, {priority: ManagerPriority.Lorry.lorry, targetId: site.container?.id, state: state})
                    */
                }
            }
            else {
                //console.log("no container at site")
            }
        }
        let dropAmount = _.sum(this.room.droppedEnergy, r => r.amount);
        if (dropAmount >= 200) {
            let current = _.filter(this.lorrys, r => r.memory.targetId == undefined).length;
            if (current == 0) {
                let setup = new CreepSetup(Roles.lorry, { pattern: [CARRY, MOVE], sizeLimit: Math.floor(dropAmount / CARRY_CAPACITY / 8) });
                (_c = this.capital.barracks) === null || _c === void 0 ? void 0 : _c.addToQueue(setup, this, { priority: ManagerPriority.Lorry.lorry, targetId: undefined, state: "withdraw" });
            }
        }
    }
    run() {
        _.forEach(this.lorrys, r => this.handleLorry(r));
    }
}

class LorryHQ extends Building {
    constructor(capital, storage) {
        super(capital, storage);
        this.name = "LorryHQ_" + storage.id;
        this.storage = storage;
        this.terminal = this.capital.terminal;
        this.manager = new LorryManager(this);
    }
    init() {
    }
    run() {
    }
}

class ReserveManager extends Manager {
    constructor(reserveSite, prio = ManagerPriority.Outpost.reserve) {
        super(reserveSite, "ReserveManager_" + reserveSite.controller.id, prio);
        this.controller = reserveSite.controller;
        this.reservers = this.creepsByRole[Roles.settler];
        this.reserveSite = reserveSite;
        this.room = reserveSite.room;
    }
    handleReserver(reserver) {
        //reserver.goAttackController(this.controller)
        reserver.goReserve(this.controller);
    }
    init() {
        var _a;
        if (this.room && this.room.hostiles.length == 0) {
            let setup = this.controller.reservation && this.controller.reservation.username == config.username && ((_a = this.controller.reservation) === null || _a === void 0 ? void 0 : _a.ticksToEnd) > 4500 ? Setups.colonisers.settler : Setups.colonisers.reserve;
            this.spawnList(1, setup);
        }
    }
    run() {
        _.forEach(this.reservers, r => this.handleReserver(r));
    }
}

class ReserveSite extends Building {
    constructor(capital, controller) {
        super(capital, controller);
        this.controller = controller;
        this.name = "ReserveSite" + controller.name;
        this.manager = new ReserveManager(this);
        this.capital = capital;
    }
    init() {
    }
    run() {
    }
}

class ScoutManager extends Manager {
    constructor(capital, prio = ManagerPriority.Scouting.stationary) {
        super(capital, "ScoutManager_" + capital.name, prio);
        this.scouts = this.creepsByRole[Roles.scout] || [];
        this.targets = this.capital.invisRooms;
    }
    handleScout(scout) {
        if (scout.memory.targetId && (scout.memory.targetId != scout.room.name || scout.pos.x == 0 || scout.pos.y == 0 || scout.pos.x == 49 || scout.pos.y == 49)) {
            let travelPos = new RoomPosition(25, 25, scout.memory.targetId);
            scout.travelTo(travelPos);
        }
        else if (scout.memory.targetId == undefined) {
            console.log("scout without target in room ", scout.room, "with target ", scout.memory.targetId);
            scout.suicide();
        }
    }
    init() {
        let currentServed = _.map(this.scouts, r => r.memory.targetId);
        _.remove(this.targets, r => currentServed.includes(r));
        if (this.targets.length > 0) {
            this.spawnList(this.scouts.length + 1, Setups.scout, { targetId: this.targets[0] });
        }
    }
    run() {
        _.forEach(this.scouts, r => this.handleScout(r));
    }
}

class WorkManager extends Manager {
    constructor(capital, prio = ManagerPriority.Capital.work) {
        super(capital, "WorkManager_" + capital.name, prio);
        this.barrierHits = {
            1: 3e+3,
            2: 3e+3,
            3: 1e+4,
            4: 5e+4,
            5: 1e+5,
            6: 5e+5,
            7: 1e+6,
            //8       : 1e+6,
            8: 2e+7,
        };
        this.critical = 2500;
        this.tolerance = 100000;
        this.fortifyThreshold = 300000;
        this.workers = this.creepsByRole[Roles.worker];
        this.setup = this.capital.level == 1 ? Setups.workers.early : Setups.workers.default;
        this.room = capital.room;
        this.repair = true;
        this.hitsGoal = this.barrierHits[this.capital.level];
        this.fortifyTargets = _.filter(this.room.barriers, r => r.hits < this.hitsGoal);
        this.criticalTargets = _.filter(this.fortifyTargets, r => r.hits < this.critical);
        this.deconstructTargets = _.merge(this.room.hostileStructures, Game.getObjectById("60bf1d5b6b88b71cd5595c5c"));
        this.repairTargets = _.filter(_.compact(this.capital.repairables), r => r.hits < 0.8 * r.hitsMax);
        _.forEach(this.capital.miningSites, r => _.remove(this.repairTargets, t => r.container && t.id == r.container.id));
        this.constructionSites = this.capital.constructionSites;
    }
    deconstructActions(worker) {
        let target = worker.pos.findClosestByMultiRoomRange(this.deconstructTargets);
        if (target) {
            worker.goDeconstruct(target);
            return true;
        }
        return false;
    }
    buildActions(worker) {
        let target = worker.pos.findClosestByMultiRoomRange(this.constructionSites);
        if (target) {
            worker.goBuild(target);
            return true;
        }
        return false;
    }
    repairActions(worker) {
        let target = worker.pos.findClosestByMultiRoomRange(this.repairTargets);
        if (target) {
            worker.goRepair(target);
            return true;
        }
        return false;
    }
    fortifyActions(worker, targets) {
        if (targets.length == 0 || this.capital.level < 4) {
            return false;
        }
        let lowTargets;
        let lowestHits = _.min(_.map(targets, r => r.hits));
        lowTargets = _.take(_.filter(targets, r => r.hits <= lowestHits + this.tolerance), 5);
        let target = worker.pos.findClosestByMultiRoomRange(lowTargets);
        if (target) {
            worker.goRepair(target);
            return true;
        }
        return false;
    }
    upgradeActions(worker) {
        var _a;
        let target = this.capital.controller;
        if (!(((_a = this.capital.controller.sign) === null || _a === void 0 ? void 0 : _a.text) == config.signature)) {
            worker.goSign(this.capital.controller);
            return true;
        }
        else {
            worker.goUpgrade(target);
            return true;
        }
    }
    handleWorker(worker) {
        if (worker.store.energy > 0) {
            if (this.capital.controller.ticksToDowngrade <= (this.capital.level >= 4 ? 8000 : 0)) {
                if (this.upgradeActions(worker)) {
                    worker.say("⚡");
                    return;
                }
            }
            if (this.deconstructTargets.length > 0) {
                if (this.deconstructActions(worker)) {
                    worker.say("🔨");
                    return;
                }
            }
            if (this.repair && this.repairTargets.length > 0) {
                if (this.repairActions(worker)) {
                    worker.say("🛠️");
                    this.repair = false;
                    return;
                }
            }
            // Fortify critical barriers
            if (this.criticalTargets.length > 0) {
                if (this.fortifyActions(worker, this.criticalTargets)) {
                    worker.say("🏛️");
                    return;
                }
            }
            // Build new structures
            if (this.constructionSites.length > 0) {
                if (this.buildActions(worker)) {
                    worker.say("☭");
                    return;
                }
            }
            if (this.fortifyTargets.length > 0) {
                if (this.fortifyActions(worker, this.fortifyTargets)) {
                    worker.say("🏛️");
                    return;
                }
            }
            if (this.capital.level < 8 || this.capital.creepsByRole[Roles.upgrader].length == 0) {
                if (this.upgradeActions(worker)) {
                    worker.say("⚡");
                    return;
                }
            }
            worker.say("BORED!");
        }
        else {
            if (this.deconstructTargets.length > 0) {
                if (this.deconstructActions(worker)) {
                    worker.say("Deconstructing!");
                    return;
                }
            }
            const drops = _.filter(this.room.droppedEnergy, r => r.amount >= worker.store.getCapacity() / 2);
            const structs = _.filter(_.compact([this.capital.storage, this.capital.terminal, ...this.capital.containers]), r => r.store[RESOURCE_ENERGY] && r.store[RESOURCE_ENERGY] >= worker.store.getCapacity());
            const tombs = _.filter(this.capital.room.tombstones, r => r.store.energy > worker.store.getCapacity() / 4);
            let targets = [];
            targets = targets.concat(...drops, ...structs, ...tombs);
            //console.log(JSON.stringify(this.room.drops))
            const target = worker.pos.findClosestByPath(targets);
            if (target) {
                worker.goWithdraw(target);
            }
            else {
                worker.say("No target");
            }
        }
    }
    init() {
        var _a;
        let currentParts = this.setup.getBodyPotential(WORK, this.capital);
        let numWorkers = 0;
        if (this.capital.stage == CapitalSize.Town) {
            let MAX_WORKERS = 5;
            let energyMinedPerTick = _.sum(_.map(this.capital.miningSites, r => _.sum(r.manager.miners, t => t.getActiveBodyparts(WORK) * HARVEST_POWER)));
            numWorkers = Math.ceil(energyMinedPerTick / currentParts / 1.1);
            numWorkers = Math.min(MAX_WORKERS, numWorkers);
        }
        else {
            let MAX_WORKERS = 10;
            let repairTicks = _.sum(this.repairTargets, r => r.hitsMax - r.hits) / REPAIR_POWER;
            let buildTicks = _.sum(this.constructionSites, r => (r.progressTotal - r.progress) / BUILD_POWER);
            let fortifyTicks = 0;
            if ((((_a = this.capital.storage) === null || _a === void 0 ? void 0 : _a.store.energy) || 0) + _.sum(this.capital.containers, r => r.store.energy) >= this.fortifyThreshold) {
                fortifyTicks = _.sum(this.fortifyTargets, r => Math.max(0, this.hitsGoal - r.hits));
            }
            numWorkers = Math.ceil(2 * (5 * buildTicks + repairTicks + fortifyTicks) / Math.ceil(currentParts * CREEP_LIFE_TIME));
            numWorkers = Math.min(numWorkers, MAX_WORKERS, Math.ceil(this.capital.assets[RESOURCE_ENERGY] / 20000));
        }
        console.log(this.room.name, "Num workers wanted: ", numWorkers);
        this.spawnList(numWorkers, this.setup);
    }
    run() {
        let repair = true;
        _.forEach(this.workers, r => this.handleWorker(r));
    }
}

//capitals are our claimed rooms. All managers will be assigned to a capital. This allows managers to spawn creeps
var CapitalSize;
(function (CapitalSize) {
    CapitalSize[CapitalSize["Town"] = 0] = "Town";
    CapitalSize[CapitalSize["City"] = 1] = "City";
    CapitalSize[CapitalSize["Megacity"] = 2] = "Megacity";
})(CapitalSize || (CapitalSize = {}));
class Capital {
    constructor(room, empire) {
        var _a;
        this.empire = empire;
        this.name = room.name;
        if (!Memory.capitals[this.name]) {
            Memory.capitals[this.name] = { outposts: [], scoutTargets: [], isBunker: true, anchor: { x: 25, y: 25, roomName: room.name } };
        }
        this.memory = Memory.capitals[this.name];
        this.capital = this;
        this.room = room;
        this.observer = this.room.observer;
        let outpostNames = Memory.capitals[this.name].outposts;
        let scoutTargets = Memory.capitals[this.name].scoutTargets;
        this.invisRooms = _.filter(_.merge(outpostNames, scoutTargets), r => !Game.rooms[r]);
        if (this.invisRooms.length > 0 && this.observer) {
            this.observer.observeRoom(this.invisRooms[0]);
            _.remove(this.invisRooms, this.invisRooms[0]);
        }
        this.outposts = _.compact(_.map(outpostNames, r => Game.rooms[r]));
        this.allRooms = this.outposts.concat([this.room]);
        this.roomNames = _.map(this.allRooms, r => r.name);
        this.controller = this.room.controller;
        this.pos = this.controller.pos;
        this.spawns = _.filter(this.room.spawns, spawn => spawn.my);
        this.coreSpawn = this.spawns[0]; //TODO FIX
        this.extensions = this.room.extensions;
        this.storage = this.room.storage;
        this.links = this.room.links;
        this.availableLinks = _.clone(this.links);
        this.terminal = this.room.terminal;
        this.towers = this.room.towers;
        this.labs = this.room.labs;
        this.powerSpawn = this.room.powerSpawn;
        this.nuker = this.room.nuker;
        this.containers = this.room.containers;
        this.ಠ_ಠ = 0;
        if (this.memory.isBunker) {
            if (this.memory.anchor) {
                this.anchor = derefRoomPosition(this.memory.anchor);
            }
            else if (this.storage) {
                this.anchor = (_a = this.storage) === null || _a === void 0 ? void 0 : _a.pos;
                this.memory.anchor = this.storage.pos;
            }
            else {
                this.anchor = undefined;
            }
        }
        this.level = this.controller.level;
        if (this.storage && this.storage.isActive() && this.spawns[0]) {
            if (this.level == 8) {
                this.stage = CapitalSize.Megacity;
            }
            else {
                this.stage = CapitalSize.City;
            }
        }
        else {
            this.stage = CapitalSize.Town;
        }
        this.sources = _.compact(_.flatten(_.map(this.allRooms, room => room.sources))); //all sources, including those in outposts
        this.minerals = this.room.minerals; //_.compact(_.flatten(_.map(this.allRooms, room => room.minerals)));
        this.constructionSites = _.flatten(_.map(this.allRooms, room => room.constructionSites)); //all construction sites
        this.repairables = _.flatten(_.map(this.allRooms, room => room.repairables)); // all objects needing repair
        this.creeps = empire.creepsByCapital[this.name];
        this.creepsByRole = _.groupBy(this.creeps, r => r.memory.role);
        for (let role in Roles) {
            if (!this.creepsByRole[role]) {
                this.creepsByRole[role] = [];
            }
        }
        this.creepsByManager = _.groupBy(this.creeps, r => r.memory.manager);
        this.hostiles = _.flatten(_.map(this.allRooms, room => room.hostiles)); //hostile creeps in all rooms
        this.miningSites = [];
        this.reserveSites = [];
        this.extractorSites = [];
        this.barracks = undefined;
        this.buildings = [];
        this.buildingsByContainer = {};
        this.managers = [];
        this.missions = [];
        this.towerNeedFilling = _.some(this.towers, r => r.energy < r.energyCapacity);
        this.assets = this.getAssets();
        this.createBuildings();
        this.workManager = this.barracks ? new WorkManager(this) : undefined;
        this.scoutManager = new ScoutManager(this);
    }
    //Method to start all buildings
    createBuildings() {
        if (this.coreSpawn) {
            this.barracks = new Barracks(this, this.spawns[0]);
            //console.log(this.barracks.name)
        }
        else {
            console.log("no spawn in " + this.room.name);
        }
        for (let source of this.sources) {
            //console.log(source)
            let site = new MiningSite(this, source);
            this.miningSites.push(site);
        }
        if (this.towers[0]) {
            this.artillery = new Artillery(this, this.towers[0]);
        }
        for (let mineral of this.minerals) {
            this.extractorSites.push(new ExtractorSite(this, mineral));
        }
        this.upgradeSite = new UpgradeSite(this, this.controller);
        if (this.storage) {
            this.lorryHQ = new LorryHQ(this, this.storage);
        }
        for (let outpost of this.outposts) {
            if (outpost.controller) {
                this.reserveSites.push(new ReserveSite(this, outpost.controller));
            }
        }
    }
    //God I hope this works
    getAssets() {
        let stores = _.map(_.compact([this.storage, this.terminal]), r => r.store);
        let creepCarries = _.map(this.creeps, creep => creep.store);
        let combined = stores.concat(creepCarries);
        var ret = {};
        for (let store of combined) {
            for (let key in store) {
                let amount = store[key] || 0;
                if (!ret[key]) {
                    ret[key] = 0;
                }
                ret[key] += amount;
            }
        }
        return ret;
    }
    init() {
        for (let structure of this.room.hostileStructures) {
            structure.destroy();
        }
        this.room.memory.lastSeen = Game.time;
        //_.forEach(this.managers, r => console.log(r.name))
        _.forEach(this.buildings, r => r.init());
        //_.forEach(this.managers, r => console.log(r.name))
        //_.forEach(this.buildings, r => console.log(r.name))
        _.forEach(this.missions, r => r.init());
        _.forEach(this.managers, r => r.init());
    }
    run() {
        _.forEach(this.managers, r => r.run());
        _.forEach(this.missions, r => r.run());
        _.forEach(this.buildings, r => r.run());
        if (this.anchor) {
            this.visualiseBunker();
        }
    }
    visualiseBunker() {
        let group = _.map(Bunker.bunkerFillTargets[6], r => Bunker.getRoomPosForBunkerCoord(r, this.anchor));
        _.forEach(group, r => new RoomVisual(this.anchor.roomName).circle(r, { fill: 'transparent', radius: 0.5, stroke: 'red' }));
        group = _.map(Bunker.bunkerFillTargets[8], r => Bunker.getRoomPosForBunkerCoord(r, this.anchor));
        _.forEach(group, r => new RoomVisual(this.anchor.roomName).circle(r, { fill: 'transparent', radius: 0.4, stroke: 'white' }));
        group = _.map(Bunker.bunkerFillTargets[2], r => Bunker.getRoomPosForBunkerCoord(r, this.anchor));
        _.forEach(group, r => new RoomVisual(this.anchor.roomName).circle(r, { fill: 'transparent', radius: 0.3, stroke: 'blue' }));
    }
}

function test2() {
}
Object.defineProperty(Room.prototype, 'storageUnits', {
    get() {
        if (!this._storageUnits) {
            this._storageUnits = _.compact([this.storage, this.terminal]).concat(this.containers);
        }
        return this._storageUnits;
    },
});
Object.defineProperty(Room.prototype, "structures", {
    get() {
        if (!this._structures) {
            this._structures = _.groupBy(this.find(FIND_STRUCTURES), s => s.structureType);
        }
        return this._structures;
    }
});
Object.defineProperty(Room.prototype, "hostileStructsByType", {
    get() {
        if (!this._structures) {
            this._structures = _.groupBy(this.find(FIND_HOSTILE_STRUCTURES), s => s.structureType);
        }
        return this._structures;
    }
});
Object.defineProperty(Room.prototype, 'my', {
    get() {
        return this.controller && this.controller.my;
    },
});
Object.defineProperties(Room.prototype, {
    hostiles: {
        get() {
            return this.find(FIND_HOSTILE_CREEPS);
        }
    },
    hostileStructures: {
        get() {
            return this.find(FIND_HOSTILE_STRUCTURES);
        }
    },
    drops: {
        get() {
            let resources = this.allDrops;
            return _.groupBy(resources, r => r.resourceType);
        }
    },
    minerals: {
        get() {
            return this.find(FIND_MINERALS);
        }
    },
    tombstones: {
        get() {
            return this.find(FIND_TOMBSTONES);
        }
    },
    allDrops: {
        get() {
            return this.find(FIND_DROPPED_RESOURCES);
        }
    },
    // Dropped resources that are eneryg
    droppedEnergy: {
        get() {
            return this.drops[RESOURCE_ENERGY] || [];
        },
    },
    droppedMinerals: {
        get() {
            let minerals = [];
            for (let resourceType in this.drops) {
                if (resourceType != RESOURCE_ENERGY && resourceType != RESOURCE_POWER) {
                    minerals = minerals.concat(this.drops[resourceType]);
                }
            }
            return minerals;
        },
    },
    droppedPower: {
        get() {
            return this.drops[RESOURCE_POWER] || [];
        },
    },
    // Spawns in the room
    spawns: {
        get() {
            return this.structures[STRUCTURE_SPAWN] || [];
        },
    },
    // All extensions in room
    extensions: {
        get() {
            return this.structures[STRUCTURE_EXTENSION] || [];
        },
    },
    // All containers in the room
    containers: {
        get() {
            return this.structures[STRUCTURE_CONTAINER] || [];
        },
    },
    // Towers
    towers: {
        get() {
            return this.structures[STRUCTURE_TOWER] || [];
        },
    },
    // Links
    links: {
        get() {
            return this.structures[STRUCTURE_LINK] || [];
        },
    },
    // Labs
    labs: {
        get() {
            return this.structures[STRUCTURE_LAB] || [];
        },
    },
    // All energy sources
    sources: {
        get() {
            return this.find(FIND_SOURCES) || [];
        },
    },
    powerSpawn: {
        get() {
            return this.structures[STRUCTURE_POWER_SPAWN] ? this.structures[STRUCTURE_POWER_SPAWN][0] : undefined;
        },
    },
    nuker: {
        get() {
            return this.structures[STRUCTURE_NUKER] ? this.structures[STRUCTURE_NUKER][0] : undefined;
        },
    },
    observer: {
        get() {
            return this.structures[STRUCTURE_OBSERVER] ? this.structures[STRUCTURE_OBSERVER][0] : undefined;
        },
    },
    // All non-barrier, non-road repairable objects
    repairables: {
        get() {
            if (!this.structures['repairables']) {
                let repairables = [];
                for (let structureType in this.structures) {
                    if (structureType != STRUCTURE_WALL &&
                        structureType != STRUCTURE_RAMPART) {
                        repairables = repairables.concat(this.structures[structureType]);
                    }
                }
                this.structures['repairables'] = _.compact(_.flatten(repairables));
            }
            return this.structures['repairables'] || [];
        },
    },
    // All containers in the room
    roads: {
        get() {
            return this.structures[STRUCTURE_ROAD] || [];
        },
    },
    // All construction sites
    constructionSites: {
        get() {
            return this.find(FIND_CONSTRUCTION_SITES) || [];
        },
    },
    // All construction sites for roads
    roadSites: {
        get() {
            return this.structures[STRUCTURE_ROAD] || [];
        },
    },
    // All walls and ramparts
    barriers: {
        get() {
            if (!this.structures['barriers']) {
                let barriers = [].concat(this.structures[STRUCTURE_WALL], this.structures[STRUCTURE_RAMPART]);
                this.structures['barriers'] = _.compact(_.flatten(barriers));
            }
            return this.structures['barriers'] || [];
        },
    },
});

function test4() {
}
RoomPosition.prototype.getAdjacentPositions = function (range = 1, filterStructures = false) {
    let roomName = this.roomName;
    let terrain = Game.map.getRoomTerrain(roomName);
    let offsets = [];
    for (let x = -range; x <= range; x++) {
        for (let y = -range; y <= range; y++) {
            if (x === 0 && y === 0 || Math.abs(x) + Math.abs(y) < range)
                continue; // Don't include the 0,0 point
            offsets.push({ x, y });
        }
    }
    let positions = _.map(offsets, r => new RoomPosition(this.x + r.x, this.y + r.y, this.roomName));
    _.remove(positions, r => !([0, 2].includes(terrain.get(r.x, r.y))));
    if (filterStructures) {
        let clearPos = [];
        for (let pos of positions) {
            if (pos.lookFor(LOOK_STRUCTURES).length == 0 || !(_.some(OBSTACLE_OBJECT_TYPES, pos.lookFor(LOOK_STRUCTURES)))) {
                clearPos.push(pos);
            }
        }
        return clearPos;
    }
    else {
        return positions;
    }
};
RoomPosition.prototype.getMultiRoomRangeTo = function (pos) {
    if (this.roomName == pos.roomName) {
        return this.getRangeTo(pos);
    }
    else {
        const from = this.roomCoords;
        const to = pos.roomCoords;
        const dx = Math.abs(50 * (to.x - from.x) + pos.x - this.x);
        const dy = Math.abs(50 * (to.y - from.y) + pos.y - this.y);
        return _.max([dx, dy]);
    }
};
Object.defineProperty(RoomPosition.prototype, 'roomCoords', {
    get: function () {
        const parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(this.roomName);
        let x = parseInt(parsed[1], 10);
        let y = parseInt(parsed[2], 10);
        if (this.roomName.includes('W'))
            x = -x;
        if (this.roomName.includes('N'))
            y = -y;
        return { x: x, y: y };
    },
    configurable: true,
});
RoomPosition.prototype.findClosestByMultiRoomRange = function (objects) {
    return minBy(objects, (obj) => this.getMultiRoomRangeTo(obj.pos));
};
const DirectionOffsets = {
    1: { x: 0, y: -1 },
    2: { x: 1, y: -1 },
    3: { x: 1, y: 0 },
    4: { x: 1, y: 1 },
    5: { x: 0, y: 1 },
    6: { x: -1, y: 1 },
    7: { x: -1, y: 0 },
    8: { x: -1, y: -1 },
};
RoomPosition.prototype.findPositionAtDirection = function (direction) {
    return new RoomPosition(this.x + DirectionOffsets[direction].x, this.y + DirectionOffsets[direction].y, this.roomName);
};

class Empire {
    constructor() {
        this.creepsByCapital = this.sortCreeps();
        this.capitals = {}; //filled in by capital constructor
        this.missions = []; //filled in with flags
        this.prepareMemory();
    }
    sortCreeps() {
        return _.groupBy(Game.creeps, r => r.memory.capital);
    }
    prepareMemory() {
        Memory.username = "Aozin";
        Memory.myRooms = Memory.myRooms || [];
        Memory.skippedRooms = []; //Rooms that were skipped due to lack of cpu, not handled yet
        Memory.capitals = Memory.capitals || {};
        this.cleanCreeps(); //Clean up memory of dead creeps
        this.cleanRooms(); //Clean up memory of dead rooms
        this.cleanFlags();
    }
    cleanFlags() {
        for (const name in Memory.flags) {
            if (Game.flags[name]) {
                continue;
            }
            else {
                delete Memory.flags[name];
            }
        }
    }
    cleanRooms() {
        if (Game.time % 300 === 0) {
            for (const name of Object.keys(Memory.rooms)) {
                if (!Memory.rooms[name].lastSeen) {
                    console.log(Game.time, 'Deleting ' + name + ' from memory no `last_seen` value');
                    delete Memory.rooms[name];
                    continue;
                }
                if (Memory.rooms[name].lastSeen < Game.time - 4000) {
                    console.log(Game.time, `Deleting ${name} from memory older than ${4000}`);
                    delete Memory.rooms[name];
                }
            }
        }
    }
    cleanCreeps() {
        for (const name in Memory.creeps) {
            if (Game.creeps[name]) {
                continue;
            }
            else {
                delete Memory.creeps[name];
            }
        }
    }
    build() {
        for (let roomName in Game.rooms) {
            let room = Game.rooms[roomName];
            if (room.controller && room.controller.my) {
                this.capitals[room.name] = new Capital(room, this);
            }
        }
        for (let flagName in Game.flags) {
            //do something
            let flag = Game.flags[flagName];
            let mission = createMission(flag, this);
        }
    }
    init() {
        test2();
        test3();
        test4();
        _.forEach(this.capitals, r => r.init());
    }
    run() {
        _.forEach(this.capitals, r => r.run());
    }
}

function loop() {
    if ((Game.cpu.bucket < 5000 && (Game.time + 1) % 5 == 0) || Game.cpu.bucket < 2000) {
        console.log("Skipping tick for cpu");
        console.log(Game.cpu.bucket);
        return;
    }
    var empire = new Empire();
    empire.build();
    empire.init();
    empire.run();
    //@ts-ignore
    console.log(Game.cpu.bucket);
}
Creep.prototype.travelTo = function (destination, options) {
    return Traveler.travelTo(this, destination, options);
};
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
/*
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);
  Empire.main.execute();
  test()
});
*/

exports.loop = loop;
//# sourceMappingURL=main.js.map
