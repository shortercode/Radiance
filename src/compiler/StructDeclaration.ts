import { AtiumType, StructAtiumType } from "./AtiumType";
import { AST } from "./core";
import { Ref } from "../WASTNode";

export class StructDeclaration {
	name: string
	type: StructAtiumType
	size: number
	fields: Map<string, AtiumType>
	source: Ref
	
	constructor (node: AST, name: string, fields: Map<string, AtiumType>) {
		this.source = Ref.from_node(node);
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