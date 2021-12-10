declare namespace NodeJS {
	interface Global {

		age?: number;

		Empire?: IEmpire;

		gc(quick?: boolean): void;
	}
}

declare var Empire: IEmpire;
interface IEmpire {
    memory: Memory;
    emperor: Emperor;
    timeToForceRebuild: number;
    shouldBuild: boolean;
    kingdoms: {[roomName:string]:Kingdom};
    missions: {[missionId:string]:Mission};
    citizens: {[creepId:string]:Citizen}


	build(): void;

	refresh(): void;

	init(): void;

	run(): void;

    postRun(): void;
}


