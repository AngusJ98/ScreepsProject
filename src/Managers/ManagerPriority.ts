export const ManagerPriority = {
    Crisis: {
        bootstrap: 0,
    },

    //Necessary for capitals to function
    Core: {
        queen: 100,
        treasurer: 101,
    },

    Defense: {
        melee: 200,
        ranged: 201,
    },

    //Managers beyond this point are non essential to the survival of the capital

    Offense: {

    },

    Colonization: { 			// Colonizing new rooms
		claim  : 400,
		pioneer: 401,
    },

    Capital: { 				// Operation of an owned room
		firstTransport: 500,		// High priority to spawn the first transporter
		miner         : 501,
		work          : 502,
		mineralRCL8   : 503,
		transport     : 510,	// Spawn the rest of the transporters
		mineral       : 520
    },

    OutpostDefense: {
		outpostDefense: 600,
		guard         : 601,
    },

    Upgrading: {				// Spawning upgraders
		upgrade: 700,
    },

    HaulUrgent: {
        haul: 800,
    },

    Scouting: {
        stationary: 900,
        random: 901,
    },

    Outpost: {
        reserve: 1000,
        mine: 1001,
        increment: 5,
    },

    SKOutpost: {
        //TODO
    },

    Haul: {
        haul: 1200
    }

}
