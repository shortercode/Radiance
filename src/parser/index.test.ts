import parser from "./index";

import AST from "../pratt/Node";
import ControlledIterator from "../pratt/Iterator";

describe("empty file", () => {
	test("empty file", () => {
		const ast = parse(``);
		compareModule(ast, []);
	});
});

describe("type parsing", () => {
	test("parse basic class", () => {
		const type = parseType(`void`);
		expect(type).toStrictEqual({
			style: "class",
			type: "void"
		});
	});
	test("parse basic tuple", () => {
		const type = parseType(`(void, void)`);
		expect(type).toStrictEqual({
			style: "tuple",
			types: [
				{ style: "class", type: "void" },
				{ style: "class", type: "void" }
			]
		});
	});
	test("parse basic unsized array", () => {
		const type = parseType(`void[]`);
		expect(type).toStrictEqual({
			style: "array",
			type: { style: "class", type: "void" },
			count: -1
		});
	});
	test("parse basic sized array", () => {
		const type = parseType(`void[42]`);
		expect(type).toStrictEqual({
			style: "array",
			type: { style: "class", type: "void" },
			count: 42
		});
	});
	test("parse nested tuple", () => {
		const type = parseType(`((void, void), void)`);
		expect(type).toStrictEqual({
			style: "tuple",
			types: [
				{
					style: "tuple",
					types: [
						{ style: "class", type: "void" },
						{ style: "class", type: "void" }
					]
				},
				{ style: "class", type: "void" }
			]
		});
	});
	test("parse unsized tuple array", () => {
		const type = parseType(`(void, void)[]`);
		expect(type).toStrictEqual({
			style: "array",
			type: {
				style: "tuple",
				types: [
					{ style: "class", type: "void" },
					{ style: "class", type: "void" }
				]
			},
			count: -1
		});
	});
	test("parse unsized array of array", () => {
		const type = parseType(`void[][]`);
		expect(type).toStrictEqual({
			style: "array",
			type: {
				style: "array",
				type: { style: "class", type: "void" },
				count: -1
			},
			count: -1
		});
	});
	test("parse empty tuple", () => {
		const type = parseType(`()`);
		expect(type).toStrictEqual({
			style: "tuple",
			types: []
		});
	});
	test("parse array floating point size", () => {
		expect(() => parseType('void[1.1]')).toThrowError("Invalid array length 1.1");
	});
});

describe("export statement", () => {
	test("export symbol", () => {
		const ast = parse(`export MySymbol`);
		compareModule(ast, [
			new AST("export", [1, 0], [1, 15], { name: "MySymbol" })
		]);
	});

	test("export inline function", () => {
		const ast = parse(`export fn MyFunction {}`);
		compareModule(ast, [
			new AST("export_function", [1, 0], [1, 23], {
				name: "MyFunction",
				type: parseType("void"),
				parameters: [],
				body: []
			})
		]);
	});
});

describe("import statement", () => {
	test("import function no parameters or return value", () => {
		const ast = parse(`import fn MyFunction`);
		compareModule(ast, [
			new AST("import_function", [1, 0], [1, 20], {
				name: "MyFunction",
				type: parseType("void"),
				parameters: []
			})
		]);
	});

	test("import function no parameters with return value", () => {
		const ast = parse(`import fn MyFunction -> Value`);
		compareModule(ast, [
			new AST("import_function", [1, 0], [1, 29], {
				name: "MyFunction",
				type: { style: "class", type: "Value" },
				parameters: []
			})
		]);
	});

	test("import function parameters with no return value", () => {
		const ast = parse(`import fn MyFunction (a: Value, b: Value)`);
		compareModule(ast, [
			new AST("import_function", [1, 0], [1, 41], {
				name: "MyFunction",
				type: parseType("void"),
				parameters: [
					{ name: "a", type: { style: "class", type: "Value" }},
					{ name: "b", type: { style: "class", type: "Value" }}
				]
			})
		]);
	});

	test("import function parameters and return value", () => {
		const ast = parse(`import fn MyFunction (a: Value, b: Value) -> Value`);
		compareModule(ast, [
			new AST("import_function", [1, 0], [1, 50], {
				name: "MyFunction",
				type: { style: "class", type: "Value" },
				parameters: [
					{ name: "a", type: { style: "class", type: "Value" }},
					{ name: "b", type: { style: "class", type: "Value" }}
				]
			})
		]);
	});
});

describe("fn statement", () => {
	test("function no parameters or return value", () => {
		const ast = parse(`fn MyFunction {}`);
		compareModule(ast, [
			new AST("function", [1, 0], [1, 16], {
				name: "MyFunction",
				type: parseType("void"),
				parameters: [],
				body: []
			})
		]);
	});

	test("function no parameters with return value", () => {
		const ast = parse(`fn MyFunction -> Value {}`);
		compareModule(ast, [
			new AST("function", [1, 0], [1, 25], {
				name: "MyFunction",
				type: { style: "class", type: "Value" },
				parameters: [],
				body: []
			})
		]);
	});

	test("function parameters with no return value", () => {
		const ast = parse(`fn MyFunction (a: Value, b: Value) {}`);
		compareModule(ast, [
			new AST("function", [1, 0], [1, 37], {
				name: "MyFunction",
				type: parseType("void"),
				parameters: [
					{ name: "a", type: { style: "class", type: "Value" }},
					{ name: "b", type: { style: "class", type: "Value" }}
				],
				body: []
			})
		]);
	});

	test("function parameters and return value", () => {
		const ast = parse(`fn MyFunction (a: Value, b: Value) -> Value {}`);
		compareModule(ast, [
			new AST("function", [1, 0], [1, 46], {
				name: "MyFunction",
				type: { style: "class", type: "Value" },
				parameters: [
					{ name: "a", type: { style: "class", type: "Value" }},
					{ name: "b", type: { style: "class", type: "Value" }}
				],
				body: []
			})
		]);
	});

	test("function parameters, return value and body", () => {
		const ast = parse(`
fn MyFunction (a: Value, b: Value) -> Value { 
	4
	2
}`);
		compareModule(ast, [
			new AST("function", [2, 0], [5, 1], {
				name: "MyFunction",
				type: { style: "class", type: "Value" },
				parameters: [
					{ name: "a", type: { style: "class", type: "Value" }},
					{ name: "b", type: { style: "class", type: "Value" }}
				],
				body: [
					new AST("expression", [3, 1], [3, 2], new AST("number", [3, 1], [3, 2], "4")),
					new AST("expression", [4, 1], [4, 2], new AST("number", [4, 1], [4, 2], "2")),
				]
			})
		]);
	});
});

describe("struct statement", () => {
	test("struct with no fields", () => {
		const ast = parse(`struct MyStruct {}`);
		compareModule(ast, [
			new AST("struct", [1, 0], [1, 18], {
				name: "MyStruct",
				fields: new Map
			})
		]);
	})

	test("struct with a field", () => {
		const ast = parse(`
struct MyStruct {
	name: void
}`);
		compareModule(ast, [
			new AST("struct", [2, 0], [4, 1], {
				name: "MyStruct",
				fields: new Map([
					["name", { style: "class", type: "void" }]
				])
			})
		]);
	});

	test("struct with fields", () => {
		const ast = parse(`
struct MyStruct {
	name: void,
	other: i32
}`);
		compareModule(ast, [
			new AST("struct", [2, 0], [5, 1], {
				name: "MyStruct",
				fields: new Map([
					["name", { style: "class", type: "void" }],
					["other", { style: "class", type: "i32" }]
				])
			})
		]);
	});
});

describe("let statement", () => {
	test("untyped uninitialised", () => {
		const ast = parse(`let myvar`);
		compareModule(ast, [
			new AST("variable", [1,0], [1, 9], { 
				name: "myvar",
				type: null,
				initial: null
			})
		]);
	});

	test("typed uninitialised", () => {
		const ast = parse(`let myvar: i32`);
		compareModule(ast, [
			new AST("variable", [1,0], [1, 14], { 
				name: "myvar",
				type: { style: "class", type: "i32" },
				initial: null
			})
		]);
	});

	test("untyped initialised", () => {
		const ast = parse(`let myvar = 42`);
		compareModule(ast, [
			new AST("variable", [1,0], [1, 14], { 
				name: "myvar",
				type: null,
				initial: new AST("number", [1, 12], [1, 14], "42")
			})
		]);
	});

	test("typed initialised", () => {
		const ast = parse(`let myvar: i32 = 42`);
		compareModule(ast, [
			new AST("variable", [1,0], [1, 19], { 
				name: "myvar",
				type: { style: "class", type: "i32" },
				initial: new AST("number", [1, 17], [1, 19], "42")
			})
		]);
	});
});

// describe("enum statement", () => {
// 	test("enum no options", () => {
// 		const ast = parse(`enum Name {}`);
// 		compareModule(ast, [
// 			new AST("enum", [1, 0], [1, 12], {
// 				name: "Name",
// 				cases: []
// 			})
// 		]);
// 	});

// 	test("enum single case with no value", () => {
// 		const ast = parse(`enum Name {
// 			a
// 		}`);
// 		compareModule(ast, [
// 			new AST("enum", [1, 0], [1, 12], {
// 				name: "Name",
// 				cases: []
// 			})
// 		]);
// 	});

// 	test("enum cases with no value", () => {
// 		const ast = parse(`enum Name {
// 			a
// 		}`);
// 		compareModule(ast, [
// 			new AST("enum", [1, 0], [1, 12], {
// 				name: "Name",
// 				cases: []
// 			})
// 		]);
// 	})
// });

describe("include statement", () => {
	
	// import all public declarations into the current namespace
	`include "module_name"`;
	// import the public declarations a, b and c into the current namespace
	`include a, b, c from "module_name"`;
	// import all public declarations into the namespace object module_name and add module_name to the current namespace
	`include "module_name" as module_name`;
});

describe("public statement", () => {
	
	`pub fn Name {}`;
	`pub protocol Name {}`;
	`pub class Name {}`;
});

describe("protocol statement", () => {

	`protocol Name {
		example_field: u32 // we expect the implementor to have this field
		example_method (a: u32) -> u32 // we expect the implementor to have this method
		example_default_method (a: u32) -> u32 {  // the implementor can override this method, or use it
			0
		} 
	}`;
});

describe("primative literals", () => {
	test("boolean true", () => {
		const ast = parse(`true`);
		compareModule(ast, [
			new AST("expression", [1,0], [1, 4], new AST("boolean", [1,0], [1, 4], "true"))
		]);
	});
	test("boolean false", () => {
		const ast = parse(`false`);
		compareModule(ast, [
			new AST("expression", [1,0], [1, 5], new AST("boolean", [1,0], [1, 5], "false"))
		]);
	});
	test("identifier", () => {
		const ast = parse(`id`);
		compareModule(ast, [
			new AST("expression", [1,0], [1, 2], new AST("identifier", [1,0], [1, 2], "id"))
		]);
	});
	test("string", () => {
		const ast = parse(`"hello"`);
		compareModule(ast, [
			new AST("expression", [1,0], [1, 7], new AST("string", [1,0], [1, 7], "hello"))
		]);
	});
	test("escaped string", () => {
		const ast = parse(String.raw`"\"hello\""`);
		compareModule(ast, [
			new AST("expression", [1,0], [1, 11], new AST("string", [1,0], [1, 11], "\"hello\""))
		]);
	});
	test("integer", () => {
		const ast = parse("42");
		compareModule(ast, [
			new AST("expression", [1,0], [1,2], new AST("number", [1,0], [1,2], "42"))
		]);
	});
	test("integer part only", () => {
		const ast = parse("42.");
		compareModule(ast, [
			new AST("expression", [1,0], [1,3], new AST("number", [1,0], [1,3], "42"))
		]);
	});
});

describe("member expression", () => {
	test("basic id member", () => {
		const ast = parse("a.name");
		compareModule(ast, [
			new AST("expression", [1,0],[1,6], new AST("member", [1,0],[1,6], {
				target: new AST("identifier", [1, 0], [1, 1], "a"),
				member: "name"
			}))
		]);
	});

	test("basic numerical member", () => {
		const ast = parse("a.0");
		compareModule(ast, [
			new AST("expression", [1,0],[1,3], new AST("member", [1,0],[1,3], {
				target: new AST("identifier", [1, 0], [1, 1], "a"),
				member: "0"
			}))
		]);
	});

	test("nested numerical member", () => {
		const ast = parse("a.0.0.0");
		compareModule(ast, [
			new AST("expression", [1,0],[1,7], new AST("member", [1,0],[1,7], {
				target: new AST("member", [1,0],[1,5], {
					target: new AST("member", [1,0],[1,3], {
						target: new AST("identifier", [1, 0], [1, 1], "a"),
						member: "0"
					}),
					member: "0"
				}),
				member: "0"
			}))
		]);
	});


})

describe("constructor expression", () => {
	test("basic constructor no fields", () => {
		const ast = parse("Obj {}");
		compareModule(ast, [
			new AST("expression", [1,0],[1,6], new AST("constructor", [1,0],[1,6], {
				target: new AST("identifier", [1, 0], [1, 3], "Obj"),
				fields: new Map()
			}))
		]);
	});

	test("basic constructor with field", () => {
		const ast = parse("Obj { a: 42 }");
		compareModule(ast, [
			new AST("expression", [1,0],[1,13], new AST("constructor", [1,0],[1,13], {
				target: new AST("identifier", [1, 0], [1, 3], "Obj"),
				fields: new Map([
					["a", new AST("number", [1, 9], [1, 11], "42")]
				])
			}))
		]);
	});

	test("basic constructor with multiple fields", () => {
		const ast = parse("Obj { a: 42, b: \"hi\" }");
		compareModule(ast, [
			new AST("expression", [1,0],[1,22], new AST("constructor", [1,0],[1,22], {
				target: new AST("identifier", [1, 0], [1, 3], "Obj"),
				fields: new Map([
					["a", new AST("number", [1, 9], [1, 11], "42")],
					["b", new AST("string", [1, 16], [1, 20], "hi")]
				])
			}))
		]);
	});
});





function parse(str: string): AST {
	return parser.parseProgram(str);
}

function parseType(str: string) {
	return parser.parseType(createCharIterator(str));
}

function createCharIterator (str: string) {
	return new ControlledIterator(parser.scanner.scan(str, ""));
}

function compareModule (source: AST, expected_stmts: AST[]) {
	expect(source).toStrictEqual(asModule(expected_stmts));
}

function asModule(stmts: AST[]): AST {
	if (stmts.length === 0) {
		const start: [number, number] = [1, 0];
		return new AST("module", start, start, stmts);
	}
	else {
		const start = stmts[0].start;
		const end = stmts[stmts.length - 1].end;
		return new AST("module", start, end, stmts);
	}
}