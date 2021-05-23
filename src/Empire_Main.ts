import { EmpirePrepareMemory } from "Empire_Memory";
import { Capital } from "Room/Capital";

export var creepsByCapital: {[name: string]: Creep[]}
export var capitals: {[name: string]: Capital};
//Runs all parts of the empire. Like an emperor

export function EmpireExecute() {
  try {
    EmpirePrepareMemory(); //sets up memory
    EmpireSortCreeps(); //Assigns creeps to their room.
    //Empire.buyPower(); //buys resources
    //Empire.handleNextroom(); //handles claiming new rooms
    //Empire.handleSquadmanager(); //military
    //Empire.handleIncomingTransactions();
    //Empire.handleMissions(); //Handles large scale operations
  } catch (e) {
    console.log('Empire Prep Exception', e.stack);
  }



  EmpireInit(); //executes rooms
  EmpireRun();
}


function EmpireInit() {
  _.forEach(Game.rooms, (r: Room) => r.init())
}
function EmpireRun() {
  _.forEach(Game.rooms, (r: Room) => r.run())
}

function EmpireSortCreeps() {

  creepsByCapital = _.groupBy(_.values(Game.creeps), r => r.memory.capital)
}

