import { AtiumType, StructAtiumType } from "./AtiumType";
import { Ref } from "../WASTNode";

export class StructDeclaration {
	name: string
	type: StructAtiumType
	size: number
	fields: Map<string, AtiumType>
	source: Ref
	
	constructor (ref: Ref, name: string, fields: Map<string, AtiumType>) {
		this.source = ref;
		this.name = name;
		this.fields = fields;
		this.type = new StructAtiumType(fields, name);

		let size = 0;
		for (const type of fields.values()) {
			size += type.size;
		}
		this.size = size;
	}
}