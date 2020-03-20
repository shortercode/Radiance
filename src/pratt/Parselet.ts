export default class Parselet {
    readonly precedence: number
    readonly parse: Function
    constructor (precedence: number, fn: Function) {
        this.precedence = precedence;
        this.parse = fn;
    }
}