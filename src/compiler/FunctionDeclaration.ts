import { LangType } from "./LangType";
import { Variable } from "./Variable";

export class FunctionDeclaration {
	type: LangType
	parameters: Array<Variable>
	readonly id: Symbol
	readonly name: string
	
	constructor (name: string, type: LangType, parameters: Array<Variable>) {
		this.type = type;
		this.id = Symbol(name);
		this.name = name;
		this.parameters = parameters;
	}
}