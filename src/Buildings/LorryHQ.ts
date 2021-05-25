import { LorryManager } from "Managers/LorryManager";
import { Capital } from "Room/Capital";
import { Building } from "./Building";


export class LorryHQ extends Building {
    name: string
    manager: LorryManager
    storage: StructureStorage
    constructor( capital: Capital, storage: StructureStorage) {
        super(capital, storage)
        this.name = "LorryHQ_" + storage.id;
        this.storage = storage;
        this.manager = new LorryManager(this)
    }

    init(): void {

    }

    run(): void {

    }
}
