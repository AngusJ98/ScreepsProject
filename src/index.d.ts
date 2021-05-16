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



interface Room {
    execute(): void;
}

interface RoomMemory {
    lastSeen: number;
    controllerId: string | null;
    sources: number;
    hostileCreepCount:number;
}

interface CreepMemory {
    capital: string;
    killed: boolean;
    recycle: boolean;
}
