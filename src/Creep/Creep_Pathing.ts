interface Creep {
    followPath(creepAction: any): boolean;
}

Creep.prototype.followPath = function(creepAction: any) {
    return true
}
