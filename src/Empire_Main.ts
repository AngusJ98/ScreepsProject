Empire.main.execute = function() {
    try {
        Empire.prepareMemory();
        Empire.buyPower();
        Empire.handleNextroom();
        Empire.handleSquadmanager();
        Empire.handleIncomingTransactions();
        Empire.handleMissions();
      } catch (e) {
        console.log('Empire Exception', e.stack);
      }
}
