/**
 * Managers are the organisers of creeps and buildings, with each having their own specialised purpose
 * They do not need vision of their room, and I will specifically make sure of this
 *
 */


export default abstract class Manager {
    pos:RoomPosition;
    name:String;
    id:String;
    priority: number;

}
