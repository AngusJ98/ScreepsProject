import { UpgradeManager } from "Managers/UpgradeManager";
import { Capital } from "Room/Capital";
import { Building } from "./Building";

export class UpgradeSite extends Building {
    manager: UpgradeManager
    name: string;
    controller: StructureController;
    constructor(capital: Capital, controller:StructureController) {
        super(capital, controller)
        this.name = "UpgradeSite_" + controller.name;
        this.manager = new UpgradeManager(this);
        this.controller = controller;
        this.capital = capital;
    }

    init(): void {

    }

    run(): void {

    }
}
