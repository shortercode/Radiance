import { LangType, StructLangType } from "./LangType";
import { Ref } from "../WASTNode";

export class StructDeclaration {
	name: string
	type: StructLangType
	size: number
	fields: Map<string, LangType>
	source: Ref
	
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