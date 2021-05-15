import * as _ from "lodash"

//Runs all parts of the empire. Like an emperor

Empire.main.execute = function() {
    try {
        Empire.prepareMemory(); //sets up memory
        //Empire.buyPower(); //buys resources
        //Empire.handleNextroom(); //handles claiming new rooms
        //Empire.handleSquadmanager(); //military
        //Empire.handleIncomingTransactions();
        //Empire.handleMissions(); //Handles large scale operations
      } catch (e) {
        console.log('Empire Exception', e.stack);
      }

    Empire.main.roomExecution(); //runs rooms
}

Empire.main.roomExecution = function() {

    _.forEach(Game.rooms, (r: Room) => r.execute())
}
