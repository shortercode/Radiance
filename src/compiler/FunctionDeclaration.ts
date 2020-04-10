import { AtiumType } from "./AtiumType.js";
import { Variable } from "./Variable.js";

export class FunctionDeclaration {
	type: AtiumType
	parameters: Array<Variable>
	locals: Array<AtiumType> = []
	
	constructor (type: AtiumType, parameters: Array<Variable>) {
		this.type = type;
		this.parameters = parameters;
	}
}