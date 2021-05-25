import { Empire } from "Empire";
import { Mission } from "./Mission";

export function createMission(flag: Flag, empire: Empire): Mission | undefined {
    switch (flag.color) {
        //Green primary is used for missions on new rooms
        case COLOR_GREEN:
            switch(flag.secondaryColor) {
                case COLOR_GREEN:
                    return new SettleMission(flag, empire);
                case COLOR_BLUE:
                    return new SetupMission(flag, empire);

            }
            break
    }

    return
}
