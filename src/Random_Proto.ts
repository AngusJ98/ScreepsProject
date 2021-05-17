interface Source {
    name: string;
}

Object.defineProperty(Source.prototype, "name", {
    get() {
        return this.id;
    }
})

interface StructureStorage {
    energy: number;
}

Object.defineProperty(StructureStorage.prototype, "energy", {
    get() {
        return this.store.energy
    }
})

interface StructureContainer {
    energy: number;
}

Object.defineProperty(StructureContainer.prototype, "energy", {
    get() {
        return this.store.energy
    }
})

interface StructureTerminal {
    energy: number;
}

Object.defineProperty(StructureTerminal.prototype, "energy", {
    get() {
        return this.store.energy
    }
})
