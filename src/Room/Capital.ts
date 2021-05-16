//capitals are our claimed rooms. All managers will be assigned to a capital. This allows managers to spawn creeps
//for other rooms to use and manager military code

import { Barracks } from "Buildings/Barracks";
import { Building } from "Buildings/Building";
import { MiningSite } from "Buildings/MiningSite";

enum capitalSize {
    Town = 0,
    City = 1,
    Megacity = 2,
}

export class Capital {
    name: string;
    capital: Capital;
    roomNames: string[];
    room: Room;
    outposts: Room[];
    allRooms: Room[];
    pos: RoomPosition;

    //room structures
    controller: StructureController;
    spawns: StructureSpawn[];
    extensions: StructureExtension[];
    storage: StructureStorage | undefined;
    links: StructureLink[];
    availableLinks: StructureLink[];
    terminal: StructureTerminal | undefined;
    towers: StructureTower[];
    labs: StructureLab[];
    powerSpawn: StructurePowerSpawn | undefined;
    nuker: StructureNuker | undefined;
    observer: StructureObserver | undefined;
    sources: Source[];
    //flags: Flag[];
    constructionSites: ConstructionSite[];
    repairables: Structure[];
    coreSpawn: StructureSpawn | undefined;

    //Buildings
    buildings: Building[]
    miningSites: { [sourceID: string]: MiningSite } //self explanatory: Sites to mine from
    barracks: Barracks | undefined; //Spawns grouped together

    level: number;
    stage: number;

    creeps: Creep[];
    creepsByManager: {[manager: string]: Creep[]}
    hostiles: Creep[]

    constructor(room:Room) {
        this.name = "Capital_" + room.name
        this.capital = this
        this.room = room;
        this.outposts = _.map(Memory.capitals.outposts, r => Game.rooms[r]) || [];
        this.allRooms = this.outposts.concat([this.room])
        this.roomNames = _.map(this.allRooms, r => r.name)

        this.controller = this.room.controller!;
        this.pos = this.controller.pos;

        this.spawns = _.filter(this.room.spawns, spawn => spawn.my)
        this.extensions = this.room.extensions
        this.storage = this.room.storage
        this.links = this.room.links
        this.availableLinks = _.clone(this.links)
        this.terminal = this.room.terminal
        this.towers = this.room.towers
        this.labs = this.room.labs
        this.powerSpawn = this.room.powerSpawn;
        this.nuker = this.room.nuker;
		this.observer = this.room.observer;


        this.level = this.controller.level

        if (this.storage && this.storage.isActive() && this.spawns[0]) {
            if (this.level = 8) {
                this.stage = capitalSize.Megacity
            } else {
                this.stage = capitalSize.City
            }
        } else {
            this.stage = capitalSize.Town
        }

        this.sources = _.flatten(_.map(this.allRooms, room => room.sources)); //all sources, including those in outposts
		this.constructionSites = _.flatten(_.map(this.allRooms, room => room.constructionSites)); //all construction sites
		this.repairables = _.flatten(_.map(this.allRooms, room => room.repairables)); // all objects needing repair

        this.creeps = creepsByCapital[this.name]
        this.creepsByManager = _.groupBy(this.creeps, r => r.memory.manager)
        this.hostiles = _.flatten(_.map(this.allRooms, room => room.hostiles)); //hostile creeps in all rooms

        this.miningSites = {};
        this.barracks = undefined;
        this.buildings = []

        this.createBuildings()
    }

    //Method to start all buildings
    createBuildings(): void {
        if (this.spawns[0]) {
            this.barracks = new Barracks(this, this.spawns[0])
        }
    }
}
