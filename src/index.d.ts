declare global {
    module NodeJS {
        interface Global {
            Empire: any;
            config: any;
        }
    }
}

declare var Empire;

interface Room {
    execute(): void;
}

interface RoomMemory {
    lastSeen: number;
    controllerId: string | null;
    sources: number;
    hostileCreepCount:number;
  }
