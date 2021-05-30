import { maxBy } from "Rando_Functions";
import { Capital } from "Room/Capital";
import { Building } from "./Building"

export class Artillery extends Building {
    towers: StructureTower[];
    manager: undefined;
    name: string
    constructor(capital: Capital, tower: StructureTower) {
        super(capital, tower);
        this.towers = this.capital.towers
        this.name = "Artillery_" + tower.id
    }

    private towerDamageAtPos(pos: RoomPosition, ignoreEnergy = false): number {
        let room = Game.rooms[pos.roomName]
		if (room) {
			let expectedDamage = 0;
			for (const tower of room.towers) {
				if (tower.energy > 0 || ignoreEnergy) {
					expectedDamage += this.singleTowerDamage(pos.getRangeTo(tower));
				}
			}
			return expectedDamage;
		} else {
			return 0;
		}
	}

    private singleTowerDamage(range: number): number {
		if (range <= TOWER_OPTIMAL_RANGE) {
			return TOWER_POWER_ATTACK;
		}
		range = Math.min(range, TOWER_FALLOFF_RANGE);
		const falloff = (range - TOWER_OPTIMAL_RANGE) / (TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE);
		return TOWER_POWER_ATTACK * (1 - TOWER_FALLOFF * falloff);
	}

    private attack(target: Creep): void {
        _.forEach(this.towers, r => r.attack(target))
    }

    init() {

    }

    run() {
        if (this.room.hostiles.length > 0) {
            let target = maxBy(this.room.hostiles, r => this.towerDamageAtPos(r.pos))
            this.attack(target!)

        }
    }

}
