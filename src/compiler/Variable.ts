import { LangType } from "./LangType";
import { Ref } from "../WASTNode";

export class Variable {
	readonly type: LangType
	readonly id: Symbol
	readonly name: string
	readonly source: Ref
	is_global: boolean = false

	constructor (ref: Ref, type: LangType, name: string) {
		this.type = type;
		this.id = Symbol(name);
		this.name = name;
		this.source = ref;
	}
}