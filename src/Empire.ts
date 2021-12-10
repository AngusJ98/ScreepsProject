import { REBUILD_INTERVAL } from "Settings";

export default class _Empire implements IEmpire {
    memory: Memory;
    emperor: Emperor;
    timeToForceRebuild: number;
    shouldBuild: boolean;
    kingdoms: {[roomName:string]:Kingdom};
    missions: {[missionId:string]:Mission};
    citizens: {[creepId:string]:Citizen}



    constructor() {
        this.memory = Memory.Empire;
        this.emperor = new Emperor();
        this.timeToForceRebuild = Game.time + REBUILD_INTERVAL;
        this.shouldBuild = true;
        this.kingdoms = {};
        this.missions = {};
        this.citizens = {}
    }

    build(): void {
        this.registerKingdoms();
        this.registerMissions();
        _.forEach(this.kingdoms, k => k.trainManagers());
        _.forEach(this.missions, m => m.trainManagers());
        this.shouldBuild = false;// only set should build to false if we got no errors
    }

    refresh(): void {
        this.memory = Memory.Empire;
        this.emperor.refresh();
        _.forEach(this.managers)

    }

    init(): void {

    }

    run(): void {

    }

    postRun(): void {

    }
}
