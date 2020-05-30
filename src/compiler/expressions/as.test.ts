import AST from "../../pratt/Node";
import { TypePattern } from "../../parser/index";
import { Compiler } from "../core";
import parser from "../../parser/index";
import ControlledIterator from "../../pratt/Iterator";
import { WASTConvertToFloat, Ref, WASTConstNode, WASTNotEqualsNode, WASTConvertToInt } from "../../WASTNode";
import { F32_TYPE, I32_TYPE, F64_TYPE, I64_TYPE } from "../LangType";

type CastASTType = AST<{
	expr: AST, 
	type: TypePattern
}>;

describe("i64 type cast", () => {
	const compiler = new Compiler();
	const pos: [number, number] = [1, 0];
	const ref = new Ref(pos, pos);

	const source_ast = new AST("as", pos, pos, { expr: new AST("number", pos, pos, "12"), type: parse_type("i64") });
	const source_wast = new WASTConstNode(ref, I64_TYPE, "12")

	test("to f32", () => {
		const ast: CastASTType = new AST("as", pos, pos, {
			expr: source_ast,
			type: parse_type("f32")
		});

		const wast = compiler.visit_expression(ast, null);
		
		expect(wast).toStrictEqual(new WASTConvertToFloat(ref, F32_TYPE, source_wast));
	});
	test("to f64", () => {
		const ast: CastASTType = new AST("as", pos, pos, {
			expr: source_ast,
			type: parse_type("f64")
		});

		const wast = compiler.visit_expression(ast, null);
		
		expect(wast).toStrictEqual(new WASTConvertToFloat(ref, F64_TYPE, source_wast));
	});
	test("to i64", () => {
		const ast: CastASTType = new AST("as", pos, pos, {
			expr: source_ast,
			type: parse_type("i64")
		});

		const wast = compiler.visit_expression(ast, null);
		
		expect(wast).toStrictEqual(source_wast);
	});
	test("to bool", () => {
		const ast: CastASTType = new AST("as", pos, pos, {
			expr: source_ast,
			type: parse_type("bool")
		});

		const wast = compiler.visit_expression(ast, null);

		expect(wast).toStrictEqual(new WASTNotEqualsNode(ref, new WASTConstNode(ref, I64_TYPE, "0"), source_wast));
	});
	test("to i32", () => {
		const ast: CastASTType = new AST("as", pos, pos, {
			expr: source_ast,
			type: parse_type("i32")
		});

		const wast = compiler.visit_expression(ast, null);
		
		expect(wast).toStrictEqual(new WASTConvertToInt(ref, I32_TYPE, source_wast));
	});
});

describe("i32 type cast", () => {
	const compiler = new Compiler();
	const pos: [number, number] = [1, 0];
	const ref = new Ref(pos, pos);

	const source_ast = new AST("as", pos, pos, { expr: new AST("number", pos, pos, "12"), type: parse_type("i32") });
	const source_wast = new WASTConstNode(ref, I32_TYPE, "12")

	test("to f32", () => {
		const ast: CastASTType = new AST("as", pos, pos, {
			expr: source_ast,
			type: parse_type("f32")
		});

		const wast = compiler.visit_expression(ast, null);
		
		expect(wast).toStrictEqual(new WASTConvertToFloat(ref, F32_TYPE, source_wast));
	});
	test("to f64", () => {
		const ast: CastASTType = new AST("as", pos, pos, {
			expr: source_ast,
			type: parse_type("f64")
		});

		const wast = compiler.visit_expression(ast, null);
		
		expect(wast).toStrictEqual(new WASTConvertToFloat(ref, F64_TYPE, source_wast));
	});
	test("to i64", () => {
		const ast: CastASTType = new AST("as", pos, pos, {
			expr: source_ast,
			type: parse_type("i64")
		});

		const wast = compiler.visit_expression(ast, null);
		
		expect(wast).toStrictEqual(new WASTConvertToInt(ref, I64_TYPE, source_wast));
	});
	test("to bool", () => {
		const ast: CastASTType = new AST("as", pos, pos, {
			expr: source_ast,
			type: parse_type("bool")
		});

		const wast = compiler.visit_expression(ast, null);

		expect(wast).toStrictEqual(new WASTNotEqualsNode(ref, new WASTConstNode(ref, I32_TYPE, "0"), source_wast));
	});
	test("to i32", () => {
		const ast: CastASTType = new AST("as", pos, pos, {
			expr: source_ast,
			type: parse_type("i32")
		});

		const wast = compiler.visit_expression(ast, null);
		
		expect(wast).toStrictEqual(source_wast);
	});
});

describe("f32 type cast", () => {
	const compiler = new Compiler();
	const pos: [number, number] = [1, 0];
	const ref = new Ref(pos, pos);

	const source_ast = new AST("as", pos, pos, { expr: new AST("number", pos, pos, "12"), type: parse_type("f32") });
	const source_wast = new WASTConstNode(ref, F32_TYPE, "12")

	test("to f32", () => {
		const ast: CastASTType = new AST("as", pos, pos, {
			expr: source_ast,
			type: parse_type("f32")
		});

		const wast = compiler.visit_expression(ast, null);
		
		expect(wast).toStrictEqual(source_wast);
	});
	test("to f64", () => {
		const ast: CastASTType = new AST("as", pos, pos, {
			expr: source_ast,
			type: parse_type("f64")
		});

		const wast = compiler.visit_expression(ast, null);
		
		expect(wast).toStrictEqual(new WASTConvertToFloat(ref, F64_TYPE, source_wast));
	});
	test("to i64", () => {
		const ast: CastASTType = new AST("as", pos, pos, {
			expr: source_ast,
			type: parse_type("i64")
		});

		const wast = compiler.visit_expression(ast, null);
		
		expect(wast).toStrictEqual(new WASTConvertToInt(ref, I64_TYPE, source_wast));
	});
	test("to bool", () => {
		const ast: CastASTType = new AST("as", pos, pos, {
			expr: source_ast,
			type: parse_type("bool")
		});

		const wast = compiler.visit_expression(ast, null);

		expect(wast).toStrictEqual(new WASTNotEqualsNode(ref, new WASTConstNode(ref, F32_TYPE, "0"), source_wast));
	});
	test("to i32", () => {
		const ast: CastASTType = new AST("as", pos, pos, {
			expr: source_ast,
			type: parse_type("i32")
		});

		const wast = compiler.visit_expression(ast, null);
		
		expect(wast).toStrictEqual(new WASTConvertToInt(ref, I32_TYPE, source_wast));
	});
});

describe("f64 type cast", () => {
	const compiler = new Compiler();
	const pos: [number, number] = [1, 0];
	const ref = new Ref(pos, pos);

	const source_ast = new AST("as", pos, pos, { expr: new AST("number", pos, pos, "12"), type: parse_type("f64") });
	const source_wast = new WASTConstNode(ref, F64_TYPE, "12")

	test("to f32", () => {
		const ast: CastASTType = new AST("as", pos, pos, {
			expr: source_ast,
			type: parse_type("f32")
		});

		const wast = compiler.visit_expression(ast, null);
		
		expect(wast).toStrictEqual(new WASTConvertToFloat(ref, F32_TYPE, source_wast));
	});
	test("to f64", () => {
		const ast: CastASTType = new AST("as", pos, pos, {
			expr: source_ast,
			type: parse_type("f64")
		});

		const wast = compiler.visit_expression(ast, null);
		
		expect(wast).toStrictEqual(source_wast);
	});
	test("to i64", () => {
		const ast: CastASTType = new AST("as", pos, pos, {
			expr: source_ast,
			type: parse_type("i64")
		});

		const wast = compiler.visit_expression(ast, null);
		
		expect(wast).toStrictEqual(new WASTConvertToInt(ref, I64_TYPE, source_wast));
	});
	test("to bool", () => {
		const ast: CastASTType = new AST("as", pos, pos, {
			expr: source_ast,
			type: parse_type("bool")
		});

		const wast = compiler.visit_expression(ast, null);

		expect(wast).toStrictEqual(new WASTNotEqualsNode(ref, new WASTConstNode(ref, F64_TYPE, "0"), source_wast));
	});
	test("to i32", () => {
		const ast: CastASTType = new AST("as", pos, pos, {
			expr: source_ast,
			type: parse_type("i32")
		});

		const wast = compiler.visit_expression(ast, null);
		
		expect(wast).toStrictEqual(new WASTConvertToInt(ref, I32_TYPE, source_wast));
	});
});

function parse_type (str: string): TypePattern {
	const tokens = new ControlledIterator(parser.scanner.scan(str, ""));
	return parser.parseType(tokens);
}