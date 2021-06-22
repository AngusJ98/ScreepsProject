import { Roles, Setups } from "Creep_Setups/Setups";
import { Manager } from "Manager";
import { ManagerPriority } from "Managers/ManagerPriority";
import { Mission } from "./Mission";
import { SettleMission } from "./SettleMission";


export class SettleManager extends Manager {
    claimers: Creep[];
    mission: SettleMission;
    controller?: StructureController | undefined;
    constructor(mission: SettleMission, prio = ManagerPriority.Colonization.claim) {
        super(mission.capital!, "SettleManager_" + mission.name, prio)
        this.mission = mission
        this.room = this.mission.room
        this.controller = this.room? this.room.controller : undefined
        this.claimers = this.creepsByRole[Roles.settler]
    }

    private handleClaimer(claimer: Creep) {
        if (this.controller && claimer.room == this.controller.room) {
            claimer.goClaim(this.controller!)
            claimer.say("CLAIMING")
        } else if (this.controller && this.controller.owner) {
            claimer.goAttackController(this.controller)
        } else {
            claimer.say("Moving")
            claimer.travelTo(this.mission.pos, {allowHostile: true, allowSK: true, maxRooms: 500, ensurePath: true})
        }
    }


    init(): void {
        this.spawnList(1, Setups.colonisers.settler)
    }

    run(): void {
        _.forEach(this.claimers, r => this.handleClaimer(r))
    }
}
