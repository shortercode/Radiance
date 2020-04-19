import Parser from "../pratt/Parser";
import Node from "../pratt/Node";
import Iterator from "../pratt/Iterator";
import Token from "../pratt/Token";

export type TypePattern = { style: "tuple", types: Array<TypePattern> } | { style: "class", type: string };

/*
This class is the first stage of the process. It converts a text stream into an
Atium AST ready to be processed. This validates the basic syntax but does not
do any static analsis on the source at this stage.
*/

const VOID_TYPE_PATTERN: TypePattern = { style: "class", type: "void" };

class AtiumParser extends Parser {
	constructor () {
		super();
		
		this.addStatement("identifier:export", this.parseExport);
		this.addStatement("identifier:import", this.parseImport);
		this.addStatement("identifier:func", this.parseFunction);
		this.addStatement("identifier:struct", this.parseStruct);
		this.addStatement("identifier:let", this.parseVariable);
		
		/*
		Precedence order low to high
		
		1. Assignment
		2. Binary Logical ( and/or )
		3. Equality
		4. Comparison
		5. Add/Sub/Bitwise OR
		6. Mul/Div/Bitwise AND
		7. Bitwise shift

		8. Prefix
		9. Function Call
		10. Grouping
		11. Literals
		
		*/
		
		this.addInfix("symbol:=",						1, this.binary("="));
		
		this.addInfix("identifier:and",			2, this.binary("and"));
		this.addInfix("identifier:or",			2, this.binary("or"));
		
		this.addInfix("symbol:==", 					3, this.binary("=="));
		this.addInfix("symbol:!=", 					3, this.binary("!="));
		
		this.addInfix("symbol:<", 					4, this.binary("<"));
		this.addInfix("symbol:>", 					4, this.binary(">"));
		this.addInfix("symbol:<=", 					4, this.binary("<="));
		this.addInfix("symbol:>=", 					4, this.binary(">="));

		this.addInfix("symbol:+", 					5, this.binary("+"));
		this.addInfix("symbol:-", 					5, this.binary("-"));
		this.addInfix("symbol:|",						5, this.binary("|"));
		
		this.addInfix("symbol:*",						6, this.binary("*"));
		this.addInfix("symbol:/",						6, this.binary("/"));
		this.addInfix("symbol:%",						6, this.binary("%"));
		this.addInfix("symbol:&",						6, this.binary("&"));

		this.addInfix("symbol:<<",					7, this.binary("<<"));
		this.addInfix("symbol:>>",					7, this.binary(">>"));
		
		this.addPrefix("identifier:not",		8, this.parseNotExpression);
		this.addPrefix("identifier:if", 		8, this.parseIfExpression);
		this.addPrefix("symbol:{", 					8, this.parseBlockExpression);
		this.addPrefix("identifier:while", 	8, this.parseWhileExpression);
		
		this.addInfix("symbol:(", 					9, this.parseCallExpression);
		this.addInfix("symbol:[",						9, this.parseSubscript);
		this.addInfix("symbol:.",						9, this.parseMemberAccess);

		this.addPrefix("symbol:(",					10, this.parseGrouping);
		
		this.addPrefix("number:", 					11, this.literal("number"));
		this.addPrefix("identifier:", 			11, this.literal("identifier"));
		this.addPrefix("identifier:true", 	11, this.literal("boolean"));
		this.addPrefix("identifier:false", 	11, this.literal("boolean"));
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

	parseSubscript(tokens: Iterator<Token>, left: Node): Node {
		const expr = this.parseExpression(tokens);
		this.ensure(tokens, "symbol:]");

		const end = tokens.previous()!.end;

		return new Node("subscript", left.start, end, { target: left, accessor: expr})
	}

	parseMemberAccess(tokens: Iterator<Token>, left: Node): Node {
		// TODO this needs improving for non-tuples
		const member = this.ensure(tokens, "number:");
		const end = tokens.previous()!.end;
		return new Node("member", left.start, end, { target: left, member})
	}
 
	parseGrouping(tokens: Iterator<Token>): Node {
		const start = tokens.previous()!.start;
		
		if (this.match(tokens, "symbol:)")) {
			const end = tokens.consume()!.end;
			return this.emitEmptyTuple(start, end);
		}

		const sub_expression = this.parseExpression(tokens);
			
		if (this.match(tokens, "symbol:,")) {
			tokens.next();
			return this.parseTuple(tokens, sub_expression, start);
		}
		
		this.ensure(tokens, "symbol:)");
		
		// NOTE previous token is the "symbol:)" read above
		const end = tokens.previous()!.end;
		return new Node("group", start, end, sub_expression);
	}

	emitEmptyTuple(start: [number, number], end: [number, number]): Node {
		return new Node("tuple", start, end, { values: [] });
	}

	parseTuple(tokens: Iterator<Token>, first: Node | null, start: [number, number]): Node {
		const values = [first];

		while (tokens.incomplete()) {
			const next = this.parseExpression(tokens);
			values.push(next);
			if (this.match(tokens, "symbol:,")) {
				tokens.next();
			}
			else {
				break;
			}
		}

		this.ensure(tokens, "symbol:)");

		const end = tokens.previous()!.end;
		return new Node("tuple", start, end, { values });

	}
	
	parseWhileExpression(tokens: Iterator<Token>): Node {
		const start = tokens.previous()!.start;
		
		const condition = this.parseExpression(tokens);
		const block = this.parseBlock(tokens);
		
		const end = tokens.previous()!.end;
		
		return new Node("while", start, end, { condition, block });
	}

	parseNotExpression(tokens: Iterator<Token>): Node {
		const start = tokens.previous()!.start;
		const subnode = this.parseExpression(tokens);
		const end = tokens.previous()!.end;
		
		return new Node("not", start, end, { subnode });
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
		
		let returnType: TypePattern = VOID_TYPE_PATTERN;
		
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

	parseStruct (tokens: Iterator<Token>): Node {
		const start = tokens.previous()!.start;
		const name = this.ensure(tokens, "identifier:");
		const fields: Map<string, TypePattern> = new Map;

		this.ensure(tokens, "symbol:{");

		while (tokens.incomplete()) { 
			const field_name = this.ensure(tokens, "identifier:");
			this.ensure(tokens, "symbol::");
			const field_type = this.parseType(tokens);
			fields.set(field_name, field_type);
			if (this.match(tokens, "symbol:,")) {
				tokens.next();
			}
			else {
				break;
			}
		}

		this.ensure(tokens, "symbol:}");
		const end = tokens.previous()!.end;
		return new Node("struct", start, end, { name, fields });
	}
	
	parseImport (tokens: Iterator<Token>): Node {
		const start = tokens.previous()!.start;
		const label = this.ensure(tokens, "identifier:");
		
		const exportable_statements = new Set(["func"]);
		
		if (exportable_statements.has(label) === false) {
			this.throwUnexpectedToken(tokens.previous()!);
		}

		switch (label) {
			case "func": {
				const name = this.ensure(tokens, "identifier:");
				const parameters = this.parseParameterBlock(tokens);
		
				let returnType: TypePattern = VOID_TYPE_PATTERN;
				
				if (this.match(tokens, "symbol:->")) {
					tokens.next();
					returnType = this.parseType(tokens);
				}

				const end = tokens.previous()!.end;

				return new Node("import_function", start, end, {
					name,
					parameters,
					type: returnType
				});
			}
			default: throw new Error("Unreachable");
		}
	}

	parseExport (tokens: Iterator<Token>): Node {
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
		let type = null;

		if (this.match(tokens, "symbol::")) {
			tokens.next();
			type = this.parseType(tokens);
		}
		
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
	
	parseParameterBlock (tokens: Iterator<Token>): Array<{ name: string, type: TypePattern }> {
		const values: Array<{ name: string, type: TypePattern }> = [];
		
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
	
	parseType(tokens: Iterator<Token>): TypePattern {
		if (this.match(tokens, "symbol:(")) {
			tokens.next();
			const types = [];

			while (tokens.incomplete() && this.match(tokens, "symbol:)") === false) {
				types.push(this.parseType(tokens));
				if (this.match(tokens, "symbol:,")) {
					tokens.next();
				}
				else {
					break;
				}
			}

			this.ensure(tokens, "symbol:)");

			return {
				style: "tuple",
				types
			}
		}
		else {
			const type = this.ensure(tokens, "identifier:");
			return {
				style: "class",
				type
			};
		}
	}
}


export default new AtiumParser;