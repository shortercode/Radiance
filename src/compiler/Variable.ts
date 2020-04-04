import { AtiumType } from "./AtiumType";

export class Variable {
		type: AtiumType
		id: number
		name: string
		constructor (type: AtiumType, name: string, id: number) {
			this.type = type;
			this.id = id;
			this.name = name;
		}
}