import * as _ from "lodash"

//Runs all parts of the empire. Like an emperor

Empire.main.execute = function() {
  try {
    Empire.prepareMemory(); //sets up memory
    Empire.sortCreeps(); //Assigns creeps to their room.
    //Empire.buyPower(); //buys resources
    //Empire.handleNextroom(); //handles claiming new rooms
    //Empire.handleSquadmanager(); //military
    //Empire.handleIncomingTransactions();
    //Empire.handleMissions(); //Handles large scale operations
  } catch (e) {
    console.log('Empire Prep Exception', e.stack);
  }



  Empire.main.roomExecution(); //executes rooms
}


Empire.main.roomExecution = function() {

    _.forEach(Game.rooms, (r: Room) => r.execute())
}

Empire.sortCreeps = function() {

  creepsByCapital = _.groupBy(Game.creeps, r => r.memory.capital)
}
