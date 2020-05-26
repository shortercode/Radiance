import { LangType } from "./LangType";
import { Variable } from "./Variable";

export class FunctionDeclaration {
	type: LangType
	parameters: Array<Variable>
	readonly id: number
	readonly name: string
	
	constructor (name: string, index: number, type: LangType, parameters: Array<Variable>) {
		this.type = type;
		this.id = index;
		this.name = name;
		this.parameters = parameters;
	}
}