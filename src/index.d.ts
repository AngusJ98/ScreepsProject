declare global {
    module NodeJS {
        interface Global {
            Empire: any;
            config: any;
            creepsByCapital: {[name: String]: Creep}
            roles: {
                any
            };
        }
    }
}
declare var creepsByCapital;
declare var Empire;
declare var roles;





interface RoomMemory {
    lastSeen: number;
    controllerId: string | null;
    sources: number;
    hostileCreepCount:number;
}

interface CreepMemory {
    killed: boolean;
    recycle: boolean;
    role: string;
    capital: string;
    routing?: any;
    manager: string;
    task?: null;
    data: {
        origin?: string,
    },
}
