import { AtiumType } from "./AtiumType";
import { Ref } from "../WASTNode";
import { AST } from "./core";

export class Variable {
	type: AtiumType
	id: number
	name: string
	source: Ref
	constructor (node: AST, type: AtiumType, name: string, id: number) {
		this.type = type;
		this.id = id;
		this.name = name;
		this.source = Ref.from_node(node);
	}
}