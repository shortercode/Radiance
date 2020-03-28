import { AtiumType } from "./AtiumType.js";

export class FunctionDeclaration {
    type: AtiumType
    parameters: Array<{ name: string, type: AtiumType}>
    constructor (type: AtiumType, parameters: Array<{ name: string, type: AtiumType }>) {
        this.type = type;
        this.parameters = parameters;
    }
}