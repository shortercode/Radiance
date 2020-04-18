import Iterator from "./Iterator"
import Token from "./Token"
import Node from "./Node";

type PrefixParserFunction = (tokens: Iterator<Token>) => Node;
type InfixParserFunction = (tokens: Iterator<Token>, left: Node, precedence: number) => Node;

export default class Parselet {
    readonly precedence: number
    readonly parse: Function
    constructor (precedence: number, fn: PrefixParserFunction | InfixParserFunction) {
        this.precedence = precedence;
        this.parse = fn;
    }
}