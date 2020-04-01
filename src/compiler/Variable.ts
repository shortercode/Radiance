import { AtiumType } from "./AtiumType";

export class Variable {
		type: AtiumType
		id: number
    constructor (type: AtiumType, id: number) {
				this.type = type;
				this.id = id;
    }
}