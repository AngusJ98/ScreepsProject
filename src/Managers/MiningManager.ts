import { MiningSite } from "Buildings/MiningSite";
import { Manager } from "Manager";
import { ManagerPriority } from "./ManagerPriority";

export class MiningManager extends Manager {
    constructor(miningSite: MiningSite, priority = ManagerPriority.Capital.miner) {
        super(miningSite, "MineManager", priority)
    }
}
