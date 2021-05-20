declare var config: any;
global.config = {
    signature: "Free Palestine - Aozin",
    nextRoom: {
        scoutMinControllerLevel: 4,
        intervalToCheck: CREEP_CLAIM_LIFE_TIME,
        maxRooms: 8,
        cpuPerRoom: 13, // Necessary CPU per room, prevent claiming new rooms
        // creep max run distance for next room
        // if terminal should send energy rooms should be close
        maxDistance: 10,
        minNewRoomDistance: 2,
        minEnergyForActive: 1000,
        notify: false,
      },

    room: {
      reservedRCL: {
        0: 1,
        1: 1,
        2: 1,
        3: 1,
        4: 1,
        5: 1,
        6: 1,
        7: 1,
        8: 1,
      },
      isHealthyStorageThreshold: 50000,
      rebuildLayout: 7654,
      handleNukeAttackInterval: 132,
      reviveEnergyCapacity: 1000,
      reviveEnergyAvailable: 1000,
      scoutInterval: 1499,
      scout: true,
      upgraderMinStorage: 0,
      upgraderStorageFactor: 2,
      lastSeenThreshold: 1000000,
      notify: false,
      observerRange: 5,
    },
    spawning: {
      prespawn: 50,
    },

    crisis: {
      emergencyMinersEnergyLimit: 2500,
    },
}
