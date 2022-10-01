import { REBUILD_INTERVAL } from "Settings";

export default class _Empire implements IEmpire {
    memory: Memory;
    emperor: Emperor;
    timeToForceRebuild: number;
    shouldBuild: boolean;
    kingdoms: {[roomName:string]:Kingdom}; //List of owned rooms hashed by roomname
    missions: {[missionId:string]:Mission}; //list of missions hashed by id
    citizens: {[creepId:string]:Creep}; //list of citizens hashed by id
    citizensByColony: {[kingdomName:string]: Creep[]};
    citizensByRole: {[role:string]:Creep[]}; // Hashtables of creeps grouped by role
    citizensByManager: {[managerId: string]: {[role: string]: Creep[]}}
    targets: {[id: string]: Creep[]}; //Hashtable of creeps grouped by their shared targets
    managers: {[managerId: string]:Manager};



    constructor() {
        this.memory = Memory.Empire;
        this.emperor = new Emperor();
        this.timeToForceRebuild = Game.time + REBUILD_INTERVAL;
        this.shouldBuild = true;
        this.kingdoms = {};
        this.missions = {};
        this.citizens = {}
        this.citizensByColony = {};
        this.citizensByRole = {};
        this.citizensByManager = {};
        this.targets = {};
        this.managers = {};
    }

    build(): void {
        this.generateCreepLists();
        this.generateTargetsTable();
        this.registerKingdoms();
        this.registerMissions();
        _.forEach(this.kingdoms, k => k.trainManagers());
        _.forEach(this.missions, m => m.trainManagers());
        this.shouldBuild = false;// only set should build to false if we got no errors
    }

    refresh(): void {
        this.shouldBuild = true;// set to rebuild if we don't finish the refresh
        this.memory = Memory.Empire;
        this.generateCreepLists();
        this.generateTargetsTable();
        this.emperor.refresh();
        _.forEach(this.managers, m => m.refresh())
        this.shouldBuild = false;// only set should build to false if we got no errors
    }

    init(): void {
        //Init managers in order of priority

    }

    run(): void {
        //Run managers in order of priority

    }

    postRun(): void {

    }

    generateCreepLists(): void {
        this.citizens = Game.creeps;
        this.citizensByColony = _.groupBy(this.citizens, c => c.memory.kingdom)
        this.citizensByRole = _.groupBy(this.citizens, c => c.memory.role)

        this.citizensByManager = {};
        let creepsByManagerUnsort = _.groupBy(this.citizens, c => c.memory.manager)
        for (let managerId in creepsByManagerUnsort) {
            this.citizensByManager[managerId] = _.groupBy(creepsByManagerUnsort[managerId], c => c.memory.role)
        }
    }

    generateTargetsTable(): void {
        this.targets = {};
        for (let creepName in this.citizens) {
            let creep = this.citizens[creepName];
            let task = creep.memory.task;
            while (task) {
                if(!this.targets[task.target.id]) {
                    this.targets[task.target.id] = [];
                }
                this.targets[task.target.id].push(creep)
                task = task.parent;
            }
        }
    }
}
