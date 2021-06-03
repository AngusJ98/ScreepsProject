import { ExtractorManager } from "Managers/ExtractorManager";
import { MiningManager } from "Managers/MiningManager";
import { Capital } from "Room/Capital";
import { Building } from "./Building";

export class ExtractorSite extends Building{
    mineral: Mineral;
    name: string
    manager: ExtractorManager;
    link: StructureLink | undefined;
    container: StructureContainer | undefined;
    extractor: StructureExtractor | undefined

    constructor(capital: Capital, mineral: Mineral) {
        super(capital, mineral);
        this.mineral = mineral;
        this.name = "ExtractorSite_" + mineral.id;
        this.container = _.first(_.filter(this.pos.findInRange(FIND_STRUCTURES, 1), r => r.structureType == STRUCTURE_CONTAINER) as StructureContainer[])
        this.extractor = _.first(_.filter(this.pos.findInRange(FIND_STRUCTURES, 1), r => r.structureType == STRUCTURE_EXTRACTOR) as StructureExtractor[])
        this.capital = capital;
        this.manager = new ExtractorManager(this)


        if(this.container) {
            this.capital.buildingsByContainer[this.container.id] = this
        }
    }

    init(): void {

    }

    run(): void {

    }
}
