declare namespace NodeJS {
	interface Global {

		age?: number;

		Empire?: IEmpire;

		gc(quick?: boolean): void;
	}
}

declare var Empire: IEmpire | undefined;
interface IEmpire {
    memory: Memory;
    emperor: Emperor;
    timeToForceRebuild: number;
    shouldBuild: boolean;
    kingdoms: {[roomName:string]:Kingdom};
    missions: {[missionId:string]:Mission};
    citizens: {[creepId:string]:Citizen};
	managers: {[managerId:string]:Manager};


	build(): void;

	refresh(): void;

	init(): void;

	run(): void;

    postRun(): void;
}

