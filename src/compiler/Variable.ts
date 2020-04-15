import { AtiumType } from "./AtiumType";
import { SourceReference } from "../WASTNode";

export class Variable {
	type: AtiumType
	id: number
	name: string
	source: SourceReference
	constructor (ref: SourceReference, type: AtiumType, name: string, id: number) {
		this.type = type;
		this.id = id;
		this.name = name;
		this.source = ref;
	}
}