


export default class LogisticsSystem {

    sources:Source[];
    targets:FillTarget[];


    constructor(sources:Source[], targets:FillTarget[]) {
        this.sources = [];
        this.targets = [];
    }

}


type Source = StructureContainer | StructureStorage | StructureExtension | Resource
type FillTarget = StructureContainer | StructureStorage | StructureExtension | StructureTerminal
