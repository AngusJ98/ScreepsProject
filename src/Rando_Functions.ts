export function maxBy<T>(objects: T[], iteratee: ((obj: T) => number | false)): T | undefined {
	let maxObj: T | undefined;
	let maxVal = -Infinity;
	let val: number | false;
	for (const i in objects) {
		val = iteratee(objects[i]);
		if (val !== false && val > maxVal) {
			maxVal = val;
			maxObj = objects[i];
		}
	}
	return maxObj;
}

export interface StoreStructure extends Structure {
	store: StoreDefinition;
	storeCapacity: number;
}


export function minBy<T>(objects: T[], iteratee: ((obj: T) => number | false)): T | undefined {
	let minObj: T | undefined;
	let minVal = Infinity;
	let val: number | false;
	for (const i in objects) {
		val = iteratee(objects[i]);
		if (val !== false && val < minVal) {
			minVal = val;
			minObj = objects[i];
		}
	}
	return minObj;
}
declare global {
	interface Source {
		name: string;
	}
	interface StructureController {
		name: string;
	}
	interface StructureStorage {
		energy: number;
		energyCapacity: number;
	}
	interface StructureContainer {
		energy: number;
		energyCapacity: number;
	}
	interface StructureTerminal {
		energy: number;
		energyCapacity: number;
	}
}

Object.defineProperty(Source.prototype, "name", {
    get() {
        return this.id;
    }
})



Object.defineProperty(StructureController.prototype, "name", {
    get() {
        return this.id;
    }
})


Object.defineProperty(StructureStorage.prototype, "energy", {
    get() {
        return this.store.energy
    }
})

Object.defineProperty(StructureStorage.prototype, "energyCapacity", {
    get() {
        return this.store.getCapacity()
    }
})

Object.defineProperty(StructureContainer.prototype, "energyCapacity", {
    get() {
        return this.store.getCapacity()
    }
})

Object.defineProperty(StructureTerminal.prototype, "energyCapacity", {
    get() {
        return this.store.getCapacity()
    }
})




Object.defineProperty(StructureContainer.prototype, "energy", {
    get() {
        return this.store.energy
    }
})



Object.defineProperty(StructureTerminal.prototype, "energy", {
    get() {
        return this.store.energy
    }
})


