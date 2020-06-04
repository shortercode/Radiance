import { LangType } from "./LangType";
import { Ref } from "../WASTNode";

export class Variable {
	readonly type: LangType
	readonly id: number
	readonly name: string
	readonly source: Ref
	readonly is_global: boolean

	constructor (ref: Ref, type: LangType, name: string, id: number, is_global: boolean) {
		this.type = type;
		this.id = id;
		this.name = name;
		this.source = ref;
		this.is_global = is_global;
	}
}