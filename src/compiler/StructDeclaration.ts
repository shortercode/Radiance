import { AtiumType } from "./AtiumType";

export class StructDeclaration {
	name: string
	fields: Map<string, AtiumType>
	
	constructor (name: string, fields: Map<string, AtiumType>) {
		this.name = name;
		this.fields = fields;
	}
}