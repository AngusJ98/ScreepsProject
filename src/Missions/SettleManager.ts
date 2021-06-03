import { Roles, Setups } from "Creep_Setups/Setups";
import { Manager } from "Manager";
import { ManagerPriority } from "Managers/ManagerPriority";
import { Mission } from "./Mission";
import { SettleMission } from "./SettleMission";


export class SettleManager extends Manager {
    claimers: Creep[];
    mission: SettleMission;
    controller?: StructureController;
    constructor(mission: SettleMission, prio = ManagerPriority.Colonization.claim) {
        super(mission, "SettleManager_" + mission.name, prio)
        this.mission = mission
        this.controller = this.room.controller
        this.claimers = this.creepsByRole[Roles.settler]
    }

    private handleClaimer(claimer: Creep) {
        console.log("Settle running")
        if (this.controller) {
            claimer.goClaim(this.controller!)
        } else {
            claimer.travelTo(this.mission.pos)
        }
    }


    init(): void {

        if (this.controller && this.controller.my) {
            console.log("removing settler flag")
            this.mission.flag.secondaryColor = COLOR_RED
        } else {
            this.spawnList(1, Setups.colonisers.settler)
        }
    }

    run(): void {
        _.forEach(this.claimers, r => this.handleClaimer(r))
    }
}
