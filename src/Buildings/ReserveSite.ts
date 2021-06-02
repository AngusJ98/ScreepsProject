import { ReserveManager } from "Managers/ReserveManager";
import { Capital } from "Room/Capital";
import { Building } from "./Building";


export class ReserveSite extends Building {
    controller: StructureController
    name: string;
    manager: ReserveManager;

    constructor(capital: Capital, controller:StructureController) {
        super(capital, controller)
        this.controller = controller;
        this.name = "ReserveSite" + controller.name;
        this.manager = new ReserveManager(this);
        this.capital = capital;
    }


    init(): void {

    }

    run(): void {

    }
}
