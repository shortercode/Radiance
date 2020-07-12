import { LangType, StructLangType } from "./LangType";
import { Ref } from "../WASTNode";

export class StructDeclaration {
	readonly name: string
	readonly type: StructLangType
	readonly size: number
	readonly fields: Map<string, LangType>
	readonly source: Ref
	
	constructor (ref: Ref, name: string, fields: Map<string, LangType>) {
		this.source = ref;
		this.name = name;
		this.fields = fields;
		this.type = new StructLangType(fields, name);

		let size = 0;
		for (const type of fields.values()) {
			size += type.size;
		}
		this.size = size;
	}
}