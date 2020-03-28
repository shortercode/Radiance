import { AtiumType } from "./AtiumType";

export class Variable {
    type: AtiumType
    constructor (type: AtiumType) {
        this.type = type;
    }
}