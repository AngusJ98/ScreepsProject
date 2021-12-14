
interface Memory {
    creeps:{[id: string]: CreepMemory}
}

interface CreepMemory {
    role: string;
    manager?:string;
    kingdom?:string;

}
