import Parser from "../pratt/Parser.js";
import Node from "../pratt/Node.js";
import Iterator from "../pratt/Iterator.js";
import Token from "../pratt/Token.js";
import SyntaxError from "../pratt/SyntaxError.js";

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
				
				/*
					Precedence order low to high

					Assignment
					Binary Logical ( and/or )
					Bitwise
					Equality
					Comparison
					Bitwise shift
					Add/Sub
					Mul/Div
					Prefix
					Function Call
					Grouping
					Literals
				*/

				this.addInfix("symbol:=",						1, this.binary("="));

				this.addInfix("symbol:==", 					4, this.binary("=="));
				this.addInfix("symbol:!=", 					4, this.binary("!="));

				this.addInfix("symbol:<", 					5, this.binary("<"));
				this.addInfix("symbol:>", 					5, this.binary(">"));
				this.addInfix("symbol:<=", 					5, this.binary("<="));
				this.addInfix("symbol:>=", 					5, this.binary(">="));

				this.addInfix("symbol:+", 					7, this.binary("+"));
				this.addInfix("symbol:-", 					7, this.binary("-"));

				this.addInfix("symbol:*",						8, this.binary("*"));
				this.addInfix("symbol:/",						8, this.binary("/"));
				
				this.addPrefix("identifier:if", 		9, this.parseIfExpression);
				this.addPrefix("symbol:{", 					9, this.parseBlockExpression);
				this.addPrefix("identifier:while", 	9, this.parseWhileExpression);

				this.addInfix("symbol:(", 					10, this.parseCallExpression);

        this.addPrefix("number:", 					12, this.literal("number"));
        this.addPrefix("identifier:", 			12, this.literal("identifier"));
        this.addPrefix("identifier:true", 	12, this.literal("boolean"));
        this.addPrefix("identifier:false", 	12, this.literal("boolean"));
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

			this.ensure(tokens, "symbol:)");
			
			// NOTE previous token is the "symbol:)" read above
			const end = tokens.previous()!.end;
			return new Node("call", start, end, { callee: left, arguments: values });
		}

		parseWhileExpression(tokens: Iterator<Token>): Node {
			const start = tokens.previous()!.start;
				
			const condition = this.parseExpression(tokens);
			const block = this.parseBlock(tokens);

			const end = tokens.previous()!.end;

			return new Node("while", start, end, { condition, block });
		}

		parseIfExpression(tokens: Iterator<Token>): Node {
				const start = tokens.previous()!.start;
				
				const condition = this.parseExpression(tokens);
				const thenBranch = this.parseBlock(tokens);
				let elseBranch = null;

				if (this.match(tokens, "identifier:else")) {
					tokens.next();
					elseBranch = this.parseBlock(tokens);
				}

				const end = tokens.previous()!.end;

				return new Node("if", start, end, { condition, thenBranch, elseBranch });
		}

    parseFunction (tokens: Iterator<Token>): Node {
				// NOTE previous token is the "identifier:func" read by statement matcher
        const start = tokens.previous()!.start;
        const name = this.ensure(tokens, "identifier:");
        const parameters = this.parseParameterBlock(tokens);

				let returnType = "void";

				if (this.match(tokens, "symbol:->")) {
						tokens.next();
						returnType = this.parseType(tokens);
				}
				
				const statements = [];
      
        this.ensure(tokens, "symbol:{");
    
        while (tokens.incomplete()) { 
          if (this.match(tokens, "symbol:}")) {
            break; // exit if a closing brace is the next token
          }
          statements.push(this.parseStatement(tokens));
        }
    
				this.ensure(tokens, "symbol:}");

				const type = returnType;
				// NOTE previous token is the "symbol:}" read above
        const end = tokens.previous()!.end;

        return new Node("function", start, end, { name, type, parameters, body: statements });
    }

    parseExport (tokens: Iterator<Token>): Node {
				// NOTE previous token is the "identifier:}" read by statement matcher
        const start = tokens.previous()!.start;
				const label = this.ensure(tokens, "identifier:");

				const exportable_statements = new Set(["func"]); // NOTE will likely add memory, globals etc. later

				if (exportable_statements.has(label)) {
					switch (label) {
						case "func": {
							const fn = this.parseFunction(tokens);
							return new Node("export_function", start, fn.end, fn.data);
						}
						default: throw new Error("Unreachable");
					}
				}
				else {
					const end = this.endStatement(tokens);
        	return new Node("export", start, end, { name: label });
				}
    }

    parseVariable (tokens: Iterator<Token>): Node {
				// NOTE previous token is the "identifier:let" read by statement matcher
        const start = tokens.previous()!.start;
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
		
		parseBlockExpression(tokens: Iterator<Token>): Node {
			tokens.back();
			return this.parseBlock(tokens);
		}

    parseBlock(tokens: Iterator<Token>): Node {
        const statements = [];
      
        this.ensure(tokens, "symbol:{");
			
				// NOTE previous token is the "symbol:{" read above
        const start = tokens.previous()!.start;
    
        while (tokens.incomplete()) { 
          if (this.match(tokens, "symbol:}")) {
            break; // exit if a closing brace is the next token
          }
          statements.push(this.parseStatement(tokens));
        }
    
        this.ensure(tokens, "symbol:}");
		
				// NOTE previous token is the "symbol:}" read above
        const end = tokens.previous()!.end;
    
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

    parseType(tokens: Iterator<Token>) {
        return this.ensure(tokens, "identifier:");
    }
}

export default new AtiumParser;