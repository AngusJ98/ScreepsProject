//capitals are our claimed rooms. All managers will be assigned to a capital. This allows managers to spawn creeps
//for other rooms to use and manager military code

import { Barracks } from "Buildings/Barracks";
import { Building } from "Buildings/Building";
import { MiningSite } from "Buildings/MiningSite";
import { Roles } from "Creep_Setups/Setups";
import { keys } from "lodash";
import { Manager } from "Manager";
import { WorkManager } from "Managers/WorkManager";

import * as I from "Room/Room_Find"

export enum CapitalSize {
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
    containers: StructureContainer[];
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
    miningSites: MiningSite[] //self explanatory: Sites to mine from
    barracks: Barracks | undefined; //Spawns grouped together

    level: number;
    stage: number;
    ಠ_ಠ: number;

    creeps: Creep[];
    creepsByRole: {[role: string]: Creep[]}
    creepsByManager: {[manager: string]: Creep[]}
    hostiles: Creep[]

    managers: Manager[];
    workManager: WorkManager;

    assets: {[type: string]: number}


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
        this.coreSpawn = this.spawns[0] //TODO FIX
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
        this.containers = this.room.containers

        this.ಠ_ಠ = 0


        this.level = this.controller.level

        if (this.storage && this.storage.isActive() && this.spawns[0]) {
            if (this.level = 8) {
                this.stage = CapitalSize.Megacity
            } else {
                this.stage = CapitalSize.City
            }
        } else {
            this.stage = CapitalSize.Town
        }

        this.sources = _.compact(_.flatten(_.map(this.allRooms, room => room.sources))); //all sources, including those in outposts
		this.constructionSites = _.flatten(_.map(this.allRooms, room => room.constructionSites)); //all construction sites
		this.repairables = _.flatten(_.map(this.allRooms, room => room.repairables)); // all objects needing repair

        this.creeps = global.creepsByCapital[this.name]
        this.creepsByRole = _.groupBy(this.creeps, r => r.memory.role)
        for (let role in Roles) {
            if (!this.creepsByRole[role]) {
                this.creepsByRole[role] = []
            }
        }
        this.creepsByManager = _.groupBy(this.creeps, r => r.memory.manager)
        this.hostiles = _.flatten(_.map(this.allRooms, room => room.hostiles)); //hostile creeps in all rooms

        this.miningSites = [];
        this.barracks = undefined;
        this.buildings = [];

        this.managers = [];
        this.workManager = new WorkManager(this);

        this.assets = this.getAssets();

        this.createBuildings()
    }

    //Method to start all buildings
    createBuildings(): void {
        if (this.coreSpawn) {
            this.barracks = new Barracks(this, this.spawns[0])
            //console.log(this.barracks.name)
        }

        for (let source of this.sources) {
            //console.log(source)
            let site: MiningSite = new MiningSite(this, source)
            this.miningSites.push(site)
        }
    }

    //God I hope this works
    private getAssets(): { [resourceType: string]: number } {
        let stores = _.map(_.compact([this.storage, this.terminal]), r => r!.store);
        let creepCarries = _.map(this.creeps, creep => creep.store)
        let combined = _.merge(stores, creepCarries)
        var ret: {[type: string]: number} = {}
        for (let store of combined) {
            for (let key in store) {
                let amount = store[key as ResourceConstant] || 0;
                if (!ret[key]) {
                    ret[key] = 0;
                }
                ret[key] += amount;
            }
        }
        return ret
    }

    init(): void {
        //_.forEach(this.managers, r => console.log(r.name))
        _.forEach(this.buildings, r => r.init())
        _.forEach(this.managers, r => r.init())
    }

    run(): void {
        _.forEach(this.managers, r => r.run())
        _.forEach(this.buildings, r => r.run())

    }
}
