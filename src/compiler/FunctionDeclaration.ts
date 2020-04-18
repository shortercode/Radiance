import { AtiumType } from "./AtiumType";
import { Variable } from "./Variable";

export class FunctionDeclaration {
	type: AtiumType
	parameters: Array<Variable>
	readonly id: number
	readonly name: string
	
	constructor (name: string, index: number, type: AtiumType, parameters: Array<Variable>) {
		this.type = type;
		this.id = index;
		this.name = name;
		this.parameters = parameters;
	}
}