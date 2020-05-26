import { LangType } from "./LangType";
import { Ref } from "../WASTNode";

export class Variable {
	type: LangType
	id: number
	name: string
	source: Ref

	constructor (ref: Ref, type: LangType, name: string, id: number) {
		this.type = type;
		this.id = id;
		this.name = name;
		this.source = ref;
	}
}