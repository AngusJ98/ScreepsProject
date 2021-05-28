import { Manager } from "Manager";
import { ManagerPriority } from "Managers/ManagerPriority";
import { Mission } from "./Mission";
import { SettleMission } from "./SettleMission";


export class SettleManager extends Commander {
    claimers: Creep[];
    constructor(mission: SettleMission, prio = ManagerPriority.Colonization.claim) {
        super(mission, "SettleManager_" + mission.name, prio)

    }
}
