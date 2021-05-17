import { MiningManager } from "Managers/MiningManager";
import { Capital } from "Room/Capital";
import { Building } from "./Building";

export class MiningSite extends Building{
    source: Source;
    name: string
    manager: MiningManager;

    constructor(capital: Capital, source: Source) {
        super(capital, source);
        this.source = source;
        this.room = source.room;
        this.name = "Mining_Site_" + source.id;
        this.capital = capital;
        this.manager! = new MiningManager(this)
    }
}
