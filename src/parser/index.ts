import Parser from "../pratt/Parser.js";
import Node from "../pratt/Node.js";
import Iterator from "../pratt/Iterator.js";
import Token from "../pratt/Token.js";

/*
    This class is the first stage of the process. It converts a text stream into an
    Atium AST ready to be processed. This validates the basic syntax but does not
    do any static analsis on the source at this stage.
*/


class AtiumParser extends Parser {
    constructor () {
        super();

        this.addStatement("identifier:export", this.parseExport);
        this.addStatement("identifier:func", this.parseFunction);
        this.addStatement("identifier:let", this.parseVariable);

				this.addInfix("symbol:+", 1, this.binary("+"));
				this.addInfix("symbol:-", 1, this.binary("-"));
				this.addInfix("symbol:(", 1, this.parseCallExpression);
        this.addPrefix("number:", 1, this.literal("number"));
        this.addPrefix("identifier:", 1, this.literal("identifier"));
        this.addPrefix("identifier:true", 1, this.literal("boolean"));
        this.addPrefix("identifier:false", 1, this.literal("boolean"));
		}
		
		parseCallExpression(tokens: Iterator<Token>, left: Node): Node {
			const start = left.start;

			const values: Array<Node> = [];

			if (!this.match(tokens, "symbol:)")) {
				while (tokens.incomplete()) {
					const sub_expression = this.parseExpression(tokens);
					values.push(sub_expression);

					if (this.match(tokens, "symbol:,")) {
							tokens.next();
					}
					else {
							break;
					}
				}
			}

			this.ensure(tokens, "symbol:)")
        
			const end = tokens.previous().end;
			return new Node("call", start, end, { callee: left, arguments: values });
		}

    parseFunction (tokens: Iterator<Token>): Node {
        const start = tokens.previous().start;
        const name = this.ensure(tokens, "identifier:");
        const parameters = this.parseParameterBlock(tokens);

        this.ensure(tokens, "symbol:->");

        const returnType = this.parseType(tokens);
        const block = this.parseBlock(tokens);

        const type = returnType;
        const end = tokens.previous().end;

        return new Node("function", start, end, { name, type, parameters, block });
    }

    parseExport (tokens: Iterator<Token>): Node {
        const start = tokens.previous().start;
        const name = this.ensure(tokens, "identifier:");
        const end = this.endStatement(tokens);
        return new Node("export", start, end, { name });
    }

    parseVariable (tokens: Iterator<Token>): Node {
        const start = tokens.previous().start;
        const name = this.ensure(tokens, "identifier:");
        let initial = null;

        this.ensure(tokens, "symbol::");
        const type = this.parseType(tokens);

        if (this.match(tokens, "symbol:=")) {
            tokens.next();
            initial = this.parseExpression(tokens);
        }
        else {
            initial = new Node("number", start, start, "0");
        }

        const end = this.endStatement(tokens);
        return new Node("variable", start, end, { name, type, initial });
    }

    parseBlock(tokens): Node {
        const statements = [];
      
        this.ensure(tokens, "symbol:{");
    
        const start = tokens.previous().start;
    
        while (tokens.incomplete()) { 
          if (this.match(tokens, "symbol:}")) {
            break; // exit if a closing brace is the next token
          }
          statements.push(this.parseStatement(tokens));
        }
    
        this.ensure(tokens, "symbol:}");
    
        const end = tokens.previous().end;
    
        return new Node("block", start, end, statements); 
    }

    parseParameterBlock (tokens: Iterator<Token>): Array<{ name: string, type: string }> {
        const values: Array<{ name: string, type: string }> = [];

        this.ensure(tokens, "symbol:(")

        if (this.match(tokens, "symbol:)")) {
            tokens.next();
            return values;
        }

        while (tokens.incomplete()) {
            const name = this.ensure(tokens, "identifier:");
            this.ensure(tokens, "symbol::");
            const type = this.parseType(tokens);
            
            values.push({ name, type });

            if (this.match(tokens, "symbol:,")) {
                tokens.next();
            }
            else {
                break;
            }
        }

        this.ensure(tokens, "symbol:)")

        return values;
    }

    parseType(tokens) {
        return this.ensure(tokens, "identifier:");
    }
}

export default new AtiumParser;