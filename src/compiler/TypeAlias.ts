import { LangType } from "./LangType";
import { Ref } from "../WASTNode";

export class TypeAlias {
	readonly name: string
	readonly type: LangType
	readonly ref: Ref
	constructor (ref: Ref, name: string, type: LangType) {
		this.ref = ref;
		this.name = name;
		this.type = type;
	}
}