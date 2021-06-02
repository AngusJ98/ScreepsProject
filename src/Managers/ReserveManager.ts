import { ReserveSite } from "Buildings/ReserveSite";
import { Roles, Setups } from "Creep_Setups/Setups";
import { Manager } from "Manager";
import { ManagerPriority } from "./ManagerPriority";

export class ReserveManager extends Manager {
    controller: StructureController;
    reservers: Creep[];
    reserveSite: ReserveSite
    room:Room;


    constructor (reserveSite: ReserveSite, prio = ManagerPriority.Outpost.reserve) {
        super(reserveSite, "ReserveManager_" + reserveSite.controller.id, prio);
        this.controller = reserveSite.controller;
        this.reservers = this.creepsByRole[Roles.settler]
        this.reserveSite = reserveSite
        this.room = reserveSite.room
    }

    private handleReserver(reserver: Creep) {
        reserver.goReserve(this.controller)
    }

    init() {
        if (this.room.hostiles.length == 0) {
            let setup = this.controller.reservation && this.controller.reservation?.ticksToEnd > 4500 ? Setups.colonisers.settler : Setups.colonisers.reserve
            this.spawnList(1, setup)
        }
    }

    run() {
        _.forEach(this.reservers, r => this.handleReserver(r));
    }
}
