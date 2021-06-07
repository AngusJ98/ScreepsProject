import { MiningManager } from "Managers/MiningManager";
import { Capital } from "Room/Capital";
import { Building } from "./Building";

export class MiningSite extends Building{
    source: Source;
    name: string
    manager: MiningManager;
    link: StructureLink | undefined;
    container: StructureContainer | undefined;
    extensions: StructureExtension[]

    constructor(capital: Capital, source: Source) {
        super(capital, source);
        this.source = source;
        this.name = "Mining_Site_" + source.id;
        this.container = _.first(_.filter(this.pos.findInRange(FIND_STRUCTURES, 1), r => r.structureType == STRUCTURE_CONTAINER) as StructureContainer[])
        this.extensions = this.pos.findInRange(this.room.extensions, 2)
        this.capital = capital;
        this.manager = new MiningManager(this)


        this.link = _.first(_.filter(this.pos.findInRange(FIND_STRUCTURES, 2), r => r.structureType == STRUCTURE_LINK) as StructureLink[])

        if(this.container) {
            this.capital.buildingsByContainer[this.container.id] = this
        }
    }

    init(): void {

    }

    run(): void {

    }
}
