import { MiningSite } from "Buildings/MiningSite";
import { Roles } from "Creep_Setups/Setups";
import { Manager } from "Manager";
import { ManagerPriority } from "./ManagerPriority";

export class MiningManager extends Manager {
    miners: Creep[]
    constructor(miningSite: MiningSite, priority = ManagerPriority.Capital.miner) {
        super(miningSite, "MineManager", priority)
        this.miners = this.creepsByRole[Roles.drone];
    }
}
