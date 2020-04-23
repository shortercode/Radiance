import { AtiumType } from "./AtiumType";
import { Ref } from "../WASTNode";

export class Variable {
	type: AtiumType
	id: number
	name: string
	source: Ref
	constructor (ref: Ref, type: AtiumType, name: string, id: number) {
		this.type = type;
		this.id = id;
		this.name = name;
		this.source = ref;
	}
}