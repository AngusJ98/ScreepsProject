import { Capital } from "Room/Capital";

export interface bodySetup {
	pattern: BodyPartConstant[];			// body pattern to be repeated
	sizeLimit: number;						// maximum number of unit repetitions to make body
	prefix: BodyPartConstant[];				// stuff at beginning of body
	suffix: BodyPartConstant[];				// stuff at end of body
	ordered: boolean;						// (?) assemble as WORK WORK MOVE MOVE instead of WORK MOVE WORK MOVE
}




export class CreepSetup {

	role: string;
    bodySetup: bodySetup;

    constructor(role: string, bodysetup = {}) {
        _.defaults(bodysetup, {
            pattern: [],
            sizeLimit: Infinity,
            ordered: true,
        });
        this.role = role;
        this.bodySetup = bodysetup as bodySetup;
    }

    /**
     * DEPRECATED
     * Calculates how bit a creep can be, and returns it.
    getBodyPotential(partType: BodyPartConstant, capital: Capital): number {
        let energyCapacity = capital.room.energyCapacityAvailable
		let body = this.generateBody(energyCapacity);
        return _.filter(body, (part: BodyPartConstant) => part == partType).length;
    }
    */

    generateBody(availableEnergy: number): BodyPartConstant[] {
        let patternCost, patternLength, numRepeats: number;
        let body: BodyPartConstant[] = [];

        //calculate how big we can make a creep
        patternCost = bodyCost(this.bodySetup.pattern);
        patternLength = this.bodySetup.pattern.length
        let energyLimit = Math.floor(availableEnergy / patternCost)
        let maxPartLimit = Math.floor(MAX_CREEP_SIZE / patternLength)
        numRepeats = Math.min(energyLimit, maxPartLimit, this.bodySetup.sizeLimit)

        if (this.bodySetup.ordered) { // repeated body pattern
			for (let part of this.bodySetup.pattern) {
				for (let i = 0; i < numRepeats; i++) {
					body.push(part);
				}
			}
		} else {
			for (let i = 0; i < numRepeats; i++) {
				body = body.concat(this.bodySetup.pattern);
			}
        }

        return body

    }
}

//Calculates cost of a body
export function bodyCost(bodyparts: BodyPartConstant[]): number {
	return _.sum(bodyparts, part => BODYPART_COST[part]);
}
