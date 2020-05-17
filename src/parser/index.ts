import Parser from "../pratt/Parser";
import Node from "../pratt/Node";
import Iterator from "../pratt/Iterator";
import Token from "../pratt/Token";

export type TypePattern = { style: "tuple", types: Array<TypePattern> } | { style: "class", type: string } | { style: "array", type: TypePattern, count: number };

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
		this.addStatement("identifier:fn", this.parseFunction);
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
		
		this.addInfix("symbol:{",						1, this.parseConstructor);
		this.addInfix("symbol:=",						2, this.parseAssignment);
		
		this.addInfix("identifier:and",			3, this.binary("and"));
		this.addInfix("identifier:or",			3, this.binary("or"));
		
		this.addInfix("symbol:==", 					4, this.binary("=="));
		this.addInfix("symbol:!=", 					4, this.binary("!="));
		
		this.addInfix("symbol:<", 					5, this.binary("<"));
		this.addInfix("symbol:>", 					5, this.binary(">"));
		this.addInfix("symbol:<=", 					5, this.binary("<="));
		this.addInfix("symbol:>=", 					5, this.binary(">="));

		this.addInfix("symbol:+", 					6, this.binary("+"));
		this.addInfix("symbol:-", 					6, this.binary("-"));
		this.addInfix("symbol:|",						6, this.binary("|"));
		
		this.addInfix("symbol:*",						7, this.binary("*"));
		this.addInfix("symbol:/",						7, this.binary("/"));
		this.addInfix("symbol:%",						7, this.binary("%"));
		this.addInfix("symbol:&",						7, this.binary("&"));

		this.addInfix("symbol:<<",					8, this.binary("<<"));
		this.addInfix("symbol:>>",					8, this.binary(">>"));
		
		this.addPrefix("identifier:not",		9, this.parseNotExpression);
		this.addPrefix("identifier:if", 		9, this.parseIfExpression);
		this.addPrefix("symbol:{", 					9, this.parseBlockExpression);
		this.addPrefix("symbol:[", 					9, this.parseArrayExpression);
		this.addPrefix("identifier:while", 	9, this.parseWhileExpression);
		
		this.addInfix("symbol:(", 					10, this.parseCallExpression);
		this.addInfix("symbol:[",						10, this.parseSubscript);
		this.addInfix("symbol:.",						10, this.parseMemberAccess);

		this.addPrefix("symbol:(",					11, this.parseGrouping);
		this.addInfix("identifier:as",			12, this.parseTypeCast);
		
		this.addPrefix("number:", 					12, this.literal("number"));
		this.addPrefix("string:",						12, this.literal("string"))
		this.addPrefix("identifier:", 			12, this.literal("identifier"));
		this.addPrefix("identifier:true", 	12, this.literal("boolean"));
		this.addPrefix("identifier:false", 	12, this.literal("boolean"));
	}

	parseAssignment(tokens: Iterator<Token>, left: Node, precedence: number): Node {
		const right = this.parseExpression(tokens, precedence - 1);
		const end = tokens.previous()!.end;
		return this.createNode("=", left.start, end, { left, right });
	}
	
	parseCallExpression(tokens: Iterator<Token>, left: Node, precedence: number): Node {
		const start = left.start;
		
		const values: Array<Node> = [];
		
		if (!this.match(tokens, "symbol:)")) {
			while (tokens.incomplete()) {
				const sub_expression = this.parseExpression(tokens, 0);
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

	parseConstructor(tokens: Iterator<Token>, left: Node, precedence: number): Node {
		const start = left.start;
		const fields: Map<string, Node> = new Map;

		while (tokens.incomplete()) { 
			const field_start = tokens.previous()!.end;
			const field_name = this.ensure(tokens, "identifier:");

			if (this.match(tokens, "symbol::")) {
				tokens.next();
				const value = this.parseExpression(tokens, 0);

				fields.set(field_name, value);
			}
			else {
				const field_end = tokens.previous()!.end;
				const value = this.createNode("identifier", field_start, field_end, field_name);

				fields.set(field_name, value);
			}
			
			if (this.match(tokens, "symbol:,")) {
				tokens.next();
			}
			else {
				break;
			}
		}

		this.ensure(tokens, "symbol:}");
		const end = tokens.previous()!.end;
		return new Node("constructor", start, end, { target: left, fields });
	}

	// NOTE not used at the moment
	parseSubscript(tokens: Iterator<Token>, left: Node): Node {
		const expr = this.parseExpression(tokens, 0);
		this.ensure(tokens, "symbol:]");

		const end = tokens.previous()!.end;

		return new Node("subscript", left.start, end, { target: left, accessor: expr})
	}

	parseMemberAccess(tokens: Iterator<Token>, left: Node): Node {
		if (this.match(tokens, "number:") || this.match(tokens, "identifier:")) {
			const member = tokens.consume()!.value;
			const end = tokens.previous()!.end;
			return new Node("member", left.start, end, { target: left, member})
		}
		else {
			this.throwUnexpectedToken(tokens.consume()!);
		}
	}
 
	parseGrouping(tokens: Iterator<Token>, precedence: number): Node {
		const start = tokens.previous()!.start;
		
		if (this.match(tokens, "symbol:)")) {
			const end = tokens.consume()!.end;
			return this.emitEmptyTuple(start, end);
		}

		const sub_expression = this.parseExpression(tokens, 0);
			
		if (this.match(tokens, "symbol:,")) {
			tokens.next();
			return this.parseTuple(tokens, sub_expression, start);
		}
		
		this.ensure(tokens, "symbol:)");
		
		// NOTE previous token is the "symbol:)" read above
		const end = tokens.previous()!.end;
		return new Node("group", start, end, sub_expression);
	}

	parseTypeCast (tokens: Iterator<Token>, left: Node): Node {
		const start = tokens.previous()!.start;
		const type = this.parseType(tokens);
		const end = tokens.previous()!.end;
		return new Node("as", start, end, { expr: left, type });
	}

	emitEmptyTuple(start: [number, number], end: [number, number]): Node {
		return new Node("tuple", start, end, { values: [] });
	}

	parseTuple(tokens: Iterator<Token>, first: Node | null, start: [number, number]): Node {
		const values = [first];

		while (tokens.incomplete()) {
			const next = this.parseExpression(tokens, 0);
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
	
	parseWhileExpression(tokens: Iterator<Token>, precedence: number): Node {
		const start = tokens.previous()!.start;
		
		const condition = this.parseExpression(tokens, 1);
		const block = this.parseBlock(tokens);
		
		const end = tokens.previous()!.end;
		
		return new Node("while", start, end, { condition, block });
	}

	parseNotExpression(tokens: Iterator<Token>, precedence: number): Node {
		const start = tokens.previous()!.start;
		const subnode = this.parseExpression(tokens, precedence);
		const end = tokens.previous()!.end;
		
		return new Node("not", start, end, { subnode });
	}
	
	parseIfExpression(tokens: Iterator<Token>, precedence: number): Node {
		const start = tokens.previous()!.start;
		
		const condition = this.parseExpression(tokens, 1);
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
		// NOTE previous token is the "identifier:fn" read by statement matcher
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
		
		const exportable_statements = new Set(["fn"]);
		
		if (exportable_statements.has(label) === false) {
			this.throwUnexpectedToken(tokens.previous()!);
		}

		switch (label) {
			case "fn": {
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
		
		const exportable_statements = new Set(["fn"]); // NOTE will likely add memory, globals etc. later
		
		if (exportable_statements.has(label)) {
			switch (label) {
				case "fn": {
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
			initial = this.parseExpression(tokens, 1);
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

	parseArrayExpression (tokens: Iterator<Token>): Node {
		const values = [];
		const start = tokens.previous()!.start;

		if (this.match(tokens, "symbol:]") === false) {
			while (tokens.incomplete()) { 
				values.push(this.parseExpression(tokens));
				if (this.match(tokens, "symbol:,")) {
					tokens.next();
				}
				else {
					break;
				}
			}
		}

		this.ensure(tokens, "symbol:]");
		
		// NOTE previous token is the "symbol:}" read above
		const end = tokens.previous()!.end;
		
		return new Node("array", start, end, values); 
	}
	
	parseParameterBlock (tokens: Iterator<Token>): Array<{ name: string, type: TypePattern }> {
		const values: Array<{ name: string, type: TypePattern }> = [];
		
		// NOTE this makes the parameter block of a function OPTIONAL! ( no params )
		if (this.match(tokens, "symbol:(") === false) {
			return values;
		}
		else {
			tokens.next();
		}
		
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
		let result: TypePattern;

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

			result = {
				style: "tuple",
				types
			};
		}
		else {
			const type = this.ensure(tokens, "identifier:");

			result = {
				style: "class",
				type
			};
		}

		while (this.match(tokens, "symbol:[")) {
			tokens.next();
			let count = -1;
			if (this.match(tokens, "symbol:]") === false) {
				const count_str = this.ensure(tokens, "number:");
				count = parseFloat(count_str);
				if (count_str.includes(".") || isNaN(count) || count < 0) {
					throw new Error(`Invalid array length ${count_str}`);
				}
			}
			
			this.ensure(tokens, "symbol:]");
			
			result = {
				style: "array",
				type: result,
				count
			};
		}

		return result;
	}
}


export default new AtiumParser;