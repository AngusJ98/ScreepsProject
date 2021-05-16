interface Room {
	print: string;
	my: boolean;
	reservedByMe: boolean;
	signedByMe: boolean;
	creeps: Creep[];
	hostiles: Creep[];
	playerHostiles: Creep[];
	hostileStructures: Structure[];
	flags: Flag[];
	// Preprocessed structures
	drops: { [resourceType: string]: Resource[] };
	droppedEnergy: Resource[];
	droppedMinerals: Resource[];
	droppedPower: Resource[];
	structures: { [structureType: string]: Structure[] };
	spawns: StructureSpawn[];
	extensions: StructureExtension[];
	containers: StructureContainer[];
	towers: StructureTower[];
	links: StructureLink[];
	labs: StructureLab[];
	sources: Source[];
	roads: StructureRoad[];
	// sinks: Sink[];
	repairables: Structure[];
	constructionSites: ConstructionSite[];
	structureSites: ConstructionSite[];
	roadSites: ConstructionSite[];
	barriers: (StructureWall | StructureRampart)[];
	powerSpawn: StructurePowerSpawn;
	nuker: StructureNuker;
	observer: StructureObserver;

	getStructures(structureType: string): Structure[];

}

Object.defineProperty(Room.prototype, "structures", {
	get() {
		if (!this._structures) {
			this._structures = _.groupBy(this.find(FIND_STRUCTURES) as Structure[], s => s.structureType);
		}
		return this._structures;
	}
})


Object.defineProperty(Room.prototype, "myCreeps", {
    get() {
        return global.creepsByCapital[this.name]
    }

})

Object.defineProperty(Room.prototype, 'my', {
	get() {
		return this.controller && this.controller.my;
	},
});

Object.defineProperties(Room.prototype, {
	// Dropped resources that are eneryg
	droppedEnergy: {
		get() {
			return this.drops[RESOURCE_ENERGY] || [];
		},
	},

	droppedMinerals: {
		get() {
			let minerals: Resource[] = [];
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
			return this.structures[STRUCTURE_POWER_SPAWN][0] || [];
		},
	},

	nuker: {
		get() {
			return this.structures[STRUCTURE_NUKER][0] || [];
		},
	},

	observer: {
		get() {
			return this.structures[STRUCTURE_OBSERVER][0] || [];
		},
	},

	// All non-barrier, non-road repairable objects
	repairables: {
		get() {
			if (!this.structures['repairables']) {
				let repairables: Structure[] = [];
				for (let structureType in this.structures) {
					if (structureType != STRUCTURE_WALL &&
						structureType != STRUCTURE_RAMPART &&
						structureType != STRUCTURE_ROAD) {
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
			return Empire.cache.constructionSites[this.name] || [];
		},
	},

	// All non-road construction sites
	structureSites: {
		get() {
			return Empire.cache.structureSites[this.name] || [];
		},
	},

	// All construction sites for roads
	roadSites: {
		get() {
			return Empire.cache.roadSites[this.name] || [];
		},
	},

	// All walls and ramparts
	barriers: {
		get() {
			if (!this.structures['barriers']) {
				let barriers = [].concat(this.structures[STRUCTURE_WALL],
										 this.structures[STRUCTURE_RAMPART]);
				this.structures['barriers'] = _.compact(_.flatten(barriers));
			}
			return this.structures['barriers'] || [];
		},
	},
});
