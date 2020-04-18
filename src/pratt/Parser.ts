import Trie from "./Trie";
import Scanner from "./Scanner"; 
import Parselet from "./Parselet";
import Iterator from "./Iterator";
import Node from "./Node";
import SyntaxError from "./SyntaxError";
import Token from "./Token";

// it's safe to define symbols ahead of time, provided we throw a matching
// error if no parselet is found for the token

const SYMBOL_LIST = [
    "!",
    "=", ":=",
    "{", "}",
    "(", ")",
    ".", ",",
    "[", "]",
    "+", "-", "/", "*", "**",
    "<", ">", "<<", ">>", "<<<", ">>>",
    "+=", "/=", "-=", "*=", "**=", 
    "%", "^", "&", ":", "|", "~", "?", ";",
    "??", "||", "&&", "::", "..", 
    "<=", ">=", "=>", "->",
    "==", "===", "!==", "!="
];

export default class Parser {
    symbols: Trie
    prefix: Map<string, Parselet>
    infix: Map<string, Parselet>
    statement: Map<string, Parselet>
    scanner: Scanner
    label: string

    constructor () {
        this.symbols = new Trie(SYMBOL_LIST);
        this.prefix = new Map;
        this.infix = new Map;
        this.statement = new Map;
        this.scanner = new Scanner(this.symbols);

        this.label = "";
    }

    // public setup functions

    addStatement (label: string, fn: (tokens: Iterator<Token>) => Node) {
        const parselet = new Parselet(0, fn.bind(this));
        this.statement.set(label, parselet);
        return this;
    }
    addPrefix (label: string, precedence: number, fn: (tokens: Iterator<Token>) => Node) {
        const parselet = new Parselet(precedence, fn.bind(this));
        this.prefix.set(label, parselet);
        return this;
    }
    addInfix (label: string, precedence: number, fn: (tokens: Iterator<Token>, left: Node, precedence: number) => Node) {
        const parselet = new Parselet(precedence, fn.bind(this));
        this.infix.set(label, parselet);
        return this;
    }
    addSymbol (str: string) {
        this.symbols.add(str);
    }
    removeSymbol (str: string) {
        this.symbols.remove(str);
    }

    parseProgram (str: string, label: string = "") {

        this.label = label + "";

        const tokens = new Iterator(this.scanner.scan(str, this.label));
        const stmts: Array<Node> = [];

        // early bail here if there are no tokens
        if (!tokens.incomplete()) {
            const pos: [number,number] = [0, 0];
            return this.createNode("module", pos, pos, stmts);
        }

				// NOTE the .incomplete() check above tells us there will always be a token
        const start = tokens.peek()!.start;
        
        while ( tokens.incomplete() ) {
            const stmt = this.parseStatement(tokens);
            stmts.push(stmt);
        }

				// NOTE the .incomplete() check at the start tells us there will always
				// be at least one token consumed before now
        const end = tokens.previous()!.end;

        return this.createNode("module", start, end, stmts);
    }
    parseStatement (tokens: Iterator<Token>) {
        const parselet = this.getStatement(tokens);

        if (parselet)
            return parselet.parse(tokens);
        else {
            tokens.back();
            const start = tokens.peek()!.start;
            const expression = this.parseExpression(tokens); 
            const end = this.endStatement(tokens);
            const stmt = this.createNode("expression", start, end, expression);
            return stmt;
        }
    }
    parseExpression (tokens: Iterator<Token>, precedence = 0) {
        let parselet = this.getPrefix(tokens);

        if (!parselet)
            this.throwUnexpectedToken(tokens.previous()!);

        let left = parselet.parse(tokens, parselet.precedence);

        while (precedence < this.getPrecedence(tokens)) {
						// NOTE getPrecedence guarentees that this will return a parselet
            parselet = this.getInfix(tokens)!;
            left = parselet.parse(tokens, left, parselet.precedence);
        }

        return left;
    }

    // private functions

    getPrefix (tokens: Iterator<Token>) {
        return this.getParselet(this.prefix, tokens.consume()!);
    }
    getInfix (tokens: Iterator<Token>) {
        return this.getParselet(this.infix, tokens.consume()!);
    }
    getStatement (tokens: Iterator<Token>) {
        return this.getParselet(this.statement, tokens.consume()!);
    }
    getPrecedence (tokens: Iterator<Token>) {
        const isEnd = tokens.incomplete()
        const parselet = isEnd ? this.getParselet(this.infix, tokens.peek()!) : null;
        return parselet ? parselet.precedence : 0;
    }
    getParselet (collection: Map<string, Parselet>, token: Token) {
        const { type, value } = token;
        return collection.get(type + ":" + value) || collection.get(type + ":");
    }

    // helpers for errors

    throwUnexpectedToken (token: Token): never {
        SyntaxError.UnexpectedToken(token, this.label);
    }

    throwSyntaxError (ln: number, col: number, msg: string): never {
        throw new SyntaxError(ln, col, msg, this.label);
    }

    throwUnexpectedEndOfInput (tokens: Iterator<Token>): never {
        const last = tokens.previous()!;
        SyntaxError.UnexpectedEndOfInput(last.end, this.label);
    }

    // helper functions for common parsing methods

    binary (type: string): (tokens: Iterator<Token>, left: Node, precedence: number) => Node {
        return (tokens, left, precedence) => {
            const right = this.parseExpression(tokens, precedence);
            const end = tokens.previous()!.end;
            return this.createNode(type, left.start, end, { left, right });
        }
    }

    unary (type: string): (tokens: Iterator<Token>, precedence: number) => Node {
        return (tokens, precedence) => {
            const start = tokens.previous()!.start;
            const expression = this.parseExpression(tokens, precedence);
            const end = tokens.previous()!.end;
            return this.createNode(type, start, end, expression); 
        }
    }

    literal (type: string): (tokens: Iterator<Token>) => Node {
        return (tokens) => {
            const token = tokens.previous()!;
            const { value, start, end } = token;

            return this.createNode(type, start, end, value); 
        }
    }

    // token utilities

    createNode (type: string, start: [number, number], end: [number, number], data: unknown): Node {
        return new Node(type, start, end, data);
    }

    readLabel (label: string): ["identifier" | "number" | "string" | "symbol", string] {
				const i = label.indexOf(":");

				const type = this.assertTokenType(label.slice(0, i));
				const value = label.slice(i + 1);
		
				return [ type, value ];
		}
		
		assertTokenType (type: string): "identifier" | "number" | "string" | "symbol" {
			switch (type) {
				case "identifier":
				case "number":
				case "string":
				case "symbol":
					return type;
				default:
					throw new Error(`Invalid token type ${type}`);
			}
		}

    match (tokens: Iterator<Token>, label: string): boolean {
        const token = tokens.peek();
        const [ type, value ] = this.readLabel(label);

        if (!token) return false;

        return token.match(type, value);
    }

    ensure (tokens: Iterator<Token>, label: string): string {
        if (!tokens.incomplete())
            this.throwUnexpectedEndOfInput(tokens);

        if (!this.match(tokens, label))
            this.throwUnexpectedToken(tokens.peek()!);

        return tokens.consume()!.value; // always matches at least the type, so return the value ( more useful )
    }

    shouldEndStatement (tokens: Iterator<Token>): boolean {
        const token = tokens.peek();

        return (!token) || token.newline || token.match("symbol", ";");
    }
    
    endStatement (tokens: Iterator<Token>): [number, number] {
        const token = tokens.peek();
        if (!token)
            return tokens.previous()!.end;
        if (token.match("symbol", ";")) {
            tokens.next();
            return token.end;
        }
        if (token.newline)
            return tokens.previous()!.end;

        this.throwUnexpectedToken(token);
    }
}