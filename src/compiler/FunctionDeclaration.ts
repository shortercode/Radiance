import { AtiumType } from "./AtiumType.js";
import { Variable } from "./Variable.js";

export class FunctionDeclaration {
	type: AtiumType
	parameters: Array<Variable>
	readonly id: number
	
	constructor (index: number, type: AtiumType, parameters: Array<Variable>) {
		this.type = type;
		this.id = index;
		this.parameters = parameters;
	}
}