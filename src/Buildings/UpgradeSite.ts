import { UpgradeManager } from "Managers/UpgradeManager";
import { maxBy } from "Rando_Functions";
import { Capital } from "Room/Capital";
import { Building } from "./Building";

export class UpgradeSite extends Building {
    manager: UpgradeManager
    name: string;
    controller: StructureController;
    container: StructureContainer | undefined;
    link: StructureLink | undefined;
    constructionSite: ConstructionSite | undefined;
    constructor(capital: Capital, controller:StructureController) {
        super(capital, controller)
        this.controller = controller;
        this.name = "UpgradeSite_" + controller.name;
        this.manager = new UpgradeManager(this);
        this.capital = capital;
        this.container = _.first(_.filter(this.pos.findInRange(FIND_STRUCTURES, 2), r => r.structureType == STRUCTURE_CONTAINER) as StructureContainer[])
        this.link = _.first(_.filter(this.pos.findInRange(FIND_STRUCTURES, 2), r => r.structureType == STRUCTURE_LINK) as StructureLink[])
        this.constructionSite = _.first(this.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 2));

        if(this.container) {
            this.capital.buildingsByContainer[this.container.id] = this
        }
    }

    buildContainerOrLink(type: STRUCTURE_CONTAINER | STRUCTURE_LINK) {
        console.log("Check!")
        if (this.link) { //Just in case we accidentally call this when we have a link already
            return
        } else { //finds the position 2 away with most adjacent spots to make pathing easier
            let possiblePos = this.controller.pos.getAdjacentPositions(2)
            let finalPos = maxBy(possiblePos, r => r.getAdjacentPositions().length)
            finalPos!.createConstructionSite(type)
        }
    }

    init(): void {

    }

    run(): void {
        if (this.room && Game.time % 20 == 0 && this.capital.level >= 3 && this.capital.storage && this.manager.upgraders && this.manager.upgraders.length > 0) {
            this.buildContainerOrLink(STRUCTURE_CONTAINER);
        }
    }
}
