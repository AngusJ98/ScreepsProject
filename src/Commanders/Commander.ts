import { Capital } from "Room/Capital";

//commanders are used when we can't see a room, and also when we may need to coordinate multiple capitals

interface ICommanderInitialiser {
	room?: Room;
	pos?: RoomPosition;
	capital?: Capital;
}
export abstract class Commander {

}
