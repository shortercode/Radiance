type TokenType = "identifier" | "number" | "string" | "symbol"

export default class Token {
    start: [number,number]
    end: [number,number]
    type: TokenType
    value: string
    newline: boolean = false

    constructor (type: TokenType, value: string, start: [number,number], end: [number,number]) {
        this.start = start;
        this.end = end;
        this.type = type;
        this.value = value;
    }
    match (type: TokenType, value = "") {
        return this.type === type && ( value === "" || value === this.value);
    }
}