import './Prototypes/Room'; // Non-structure room prototypes
import _Empire  from "./Empire"

function main(): void {

    if(!Empire || Empire.shouldBuild || Game.time >= Empire.timeToForceRebuild) {
        delete global.Empire;
        global.Empire = new _Empire();
    } else {
        Empire.refresh();
    }


    Empire.init();
    Empire.run();
    Empire.postRun();
}

function onReset() {
    global.Empire = new _Empire();
}

export const loop = main;

//Call the global reset function
//This is run when code is compiled on server
onReset();
