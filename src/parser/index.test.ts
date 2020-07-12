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
	test("parse enum variant", () => {
		expect(parseType('type.variant')).toStrictEqual({
			style: "member",
			type: {
				style: "class",
				type: "type"
			},
			name: "variant"
		});
	})
	test("parse generic single type", () => {
		expect(parseType('Vec3:<f32>')).toStrictEqual({
			style: "generic",
			type: {
				style: "class",
				type: "Vec3"
			},
			arguments: [
				{
					style: "class",
					type: "f32"
				}
			]
		})
	});
	test("parse generic multiple type", () => {
		expect(parseType('Vec3:<f32, i32, void>')).toStrictEqual({
			style: "generic",
			type: {
				style: "class",
				type: "Vec3"
			},
			arguments: [
				{
					style: "class",
					type: "f32"
				},
				{
					style: "class",
					type: "i32"
				},
				{
					style: "class",
					type: "void"
				}
			]
		})
	})
	test("parse generic no type", () => {
		expect(parseType('Vec3:<>')).toStrictEqual({
			style: "generic",
			type: {
				style: "class",
				type: "Vec3"
			},
			arguments: []
		})
	});
	test("parse variant generic", () => {
		expect(parseType('enum.type:<T>')).toStrictEqual({
			style: "generic",
			type: {
				style: "member",
				type: {
					style: "class",
					type: "enum"
				},
				name: "type"
			},
			arguments: [{
				style: "class",
				type: "T"
			}]
		})
	});
	test("parse generic nested type", () => {
		expect(parseType('Vec:<Map:<K, V> >')).toStrictEqual({
			style: "generic",
			type: {
				style: "class",
				type: "Vec"
			},
			arguments: [{
				style: "generic",
				type: {
					style: "class",
					type: "Map"
				},
				arguments: [
					{
						style: "class",
						type: "K"
					},
					{
						style: "class",
						type: "V"
					}
				]
			}]
		})
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
				generics: [],
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
					{ name: "a", type: { style: "class", type: "Value" } },
					{ name: "b", type: { style: "class", type: "Value" } }
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
					{ name: "a", type: { style: "class", type: "Value" } },
					{ name: "b", type: { style: "class", type: "Value" } }
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
				generics: [],
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
				generics: [],
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
					{ name: "a", type: { style: "class", type: "Value" } },
					{ name: "b", type: { style: "class", type: "Value" } }
				],
				generics: [],
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
					{ name: "a", type: { style: "class", type: "Value" } },
					{ name: "b", type: { style: "class", type: "Value" } }
				],
				generics: [],
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
					{ name: "a", type: { style: "class", type: "Value" } },
					{ name: "b", type: { style: "class", type: "Value" } }
				],
				generics: [],
				body: [
					new AST("expression", [3, 1], [3, 2], new AST("number", [3, 1], [3, 2], "4")),
					new AST("expression", [4, 1], [4, 2], new AST("number", [4, 1], [4, 2], "2")),
				]
			})
		]);
	});

	test("function empty generics, no parameters or return type", () => {
		const ast = parse(`fn MyFunction<> {}`);
		compareModule(ast, [
			new AST("function", [1, 0], [1, 18], {
				name: "MyFunction",
				type: parseType("void"),
				parameters: [],
				generics: [],
				body: []
			})
		]);
	});

	test("function with generics, no parameters or return type", () => {
		const ast = parse(`fn MyFunction<K, V> {}`);
		compareModule(ast, [
			new AST("function", [1, 0], [1, 22], {
				name: "MyFunction",
				type: parseType("void"),
				parameters: [],
				generics: ["K", "V"],
				body: []
			})
		]);
	});

	test("function with generics and parameters but no return type", () => {
		const ast = parse(`fn MyFunction<K, V> (a: K, b: V) {}`);
		compareModule(ast, [
			new AST("function", [1, 0], [1, 35], {
				name: "MyFunction",
				type: parseType("void"),
				parameters: [
					{ name: "a", type: { style: "class", type: "K" } },
					{ name: "b", type: { style: "class", type: "V" } }
				],
				generics: ["K", "V"],
				body: []
			})
		]);
	});

	test("function with generics and parameters and return type", () => {
		const ast = parse(`fn MyFunction<K, V> (a: K, b: V) -> V {}`);
		compareModule(ast, [
			new AST("function", [1, 0], [1, 40], {
				name: "MyFunction",
				type: { style: "class", type: "V" },
				parameters: [
					{ name: "a", type: { style: "class", type: "K" } },
					{ name: "b", type: { style: "class", type: "V" } }
				],
				generics: ["K", "V"],
				body: []
			})
		]);
	});

	test("function with generics and return type, but no parameters", () => {
		const ast = parse(`fn MyFunction<V> -> V {}`);
		compareModule(ast, [
			new AST("function", [1, 0], [1, 24], {
				name: "MyFunction",
				type: { style: "class", type: "V" },
				parameters: [],
				generics: ["V"],
				body: []
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
				fields: new Map,
				generics: []
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
				]),
				generics: []
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
				]),
				generics: []
			})
		]);
	});

	test("struct with generics", () => {
		const ast = parse(`
struct MyStruct<K, V> {
	name: K,
	other: V
}`);
		compareModule(ast, [
			new AST("struct", [2, 0], [5, 1], {
				name: "MyStruct",
				fields: new Map([
					["name", { style: "class", type: "K" }],
					["other", { style: "class", type: "V" }]
				]),
				generics: ["K", "V"]
			})
		]);
	});
});

describe("let statement", () => {
	test("untyped uninitialised", () => {
		const ast = parse(`let myvar`);
		compareModule(ast, [
			new AST("variable", [1, 0], [1, 9], {
				name: "myvar",
				type: null,
				initial: null
			})
		]);
	});

	test("typed uninitialised", () => {
		const ast = parse(`let myvar: i32`);
		compareModule(ast, [
			new AST("variable", [1, 0], [1, 14], {
				name: "myvar",
				type: { style: "class", type: "i32" },
				initial: null
			})
		]);
	});

	test("untyped initialised", () => {
		const ast = parse(`let myvar = 42`);
		compareModule(ast, [
			new AST("variable", [1, 0], [1, 14], {
				name: "myvar",
				type: null,
				initial: new AST("number", [1, 12], [1, 14], "42")
			})
		]);
	});

	test("typed initialised", () => {
		const ast = parse(`let myvar: i32 = 42`);
		compareModule(ast, [
			new AST("variable", [1, 0], [1, 19], {
				name: "myvar",
				type: { style: "class", type: "i32" },
				initial: new AST("number", [1, 17], [1, 19], "42")
			})
		]);
	});
});

describe("enum statement", () => {
	test("enum no cases", () => {
		const ast = parse(`enum Name {}`);
		compareModule(ast, [
			new AST("enum", [1, 0], [1, 12], {
				name: "Name",
				cases: new Map
			})
		]);
	});

	test("enum single case with no value", () => {
		const ast = parse(`
enum Name {
	case a
}`);
		compareModule(ast, [
			new AST("enum", [2, 0], [4, 1], {
				name: "Name",
				cases: new Map([
					["a", { start: [3, 1], end: [3, 7], name: "a", fields: null }]
				])
			})
		]);
	});

	test("enum multiple cases no value", () => {
		const ast = parse(`
enum Compass {
	case north,
	case south,
	case east,
	case west
}`);
		compareModule(ast, [
			new AST("enum", [2, 0], [7, 1], {
				name: "Compass",
				cases: new Map([
					["north", { start: [3, 1], end: [3, 11], name: "north", fields: null }],
					["south", { start: [4, 1], end: [4, 11], name: "south", fields: null }],
					["east", { start: [5, 1], end: [5, 10], name: "east", fields: null }],
					["west", { start: [6, 1], end: [6, 10], name: "west", fields: null }]
				])
			})
		]);
	});

	test("enum multiple cases with values", () => {
		const ast = parse(`
enum Barcode {
	case upc { a: i32, b: i32, c: i32, d: i32 },
	case qrcode { value: string }
}`);
		compareModule(ast, [
			new AST("enum", [2, 0], [5, 1], {
				name: "Barcode",
				cases: new Map([
					["upc", {
						start: [3, 1], end: [3, 44], name: "upc", fields: new Map([
							["a", { style: "class", type: "i32" }],
							["b", { style: "class", type: "i32" }],
							["c", { style: "class", type: "i32" }],
							["d", { style: "class", type: "i32" }]
						])
					}],
					["qrcode", {
						start: [4, 1], end: [4, 30], name: "qrcode", fields: new Map([
							["value", { style: "class", type: "string" }]
						])
					}]
				])
			})
		])
	});
});

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
			new AST("expression", [1, 0], [1, 4], new AST("boolean", [1, 0], [1, 4], "true"))
		]);
	});
	test("boolean false", () => {
		const ast = parse(`false`);
		compareModule(ast, [
			new AST("expression", [1, 0], [1, 5], new AST("boolean", [1, 0], [1, 5], "false"))
		]);
	});
	test("identifier", () => {
		const ast = parse(`id`);
		compareModule(ast, [
			new AST("expression", [1, 0], [1, 2], new AST("identifier", [1, 0], [1, 2], "id"))
		]);
	});
	test("string", () => {
		const ast = parse(`"hello"`);
		compareModule(ast, [
			new AST("expression", [1, 0], [1, 7], new AST("string", [1, 0], [1, 7], "hello"))
		]);
	});
	test("escaped string", () => {
		const ast = parse(String.raw`"\"hello\""`);
		compareModule(ast, [
			new AST("expression", [1, 0], [1, 11], new AST("string", [1, 0], [1, 11], "\"hello\""))
		]);
	});
	test("integer", () => {
		const ast = parse("42");
		compareModule(ast, [
			new AST("expression", [1, 0], [1, 2], new AST("number", [1, 0], [1, 2], "42"))
		]);
	});
	test("integer part only", () => {
		const ast = parse("42.");
		compareModule(ast, [
			new AST("expression", [1, 0], [1, 3], new AST("number", [1, 0], [1, 3], "42"))
		]);
	});
});

describe("member expression", () => {
	test("basic id member", () => {
		const ast = parse("a.name");
		compareModule(ast, [
			new AST("expression", [1, 0], [1, 6], new AST("member", [1, 0], [1, 6], {
				target: new AST("identifier", [1, 0], [1, 1], "a"),
				member: "name"
			}))
		]);
	});

	test("basic numerical member", () => {
		const ast = parse("a.0");
		compareModule(ast, [
			new AST("expression", [1, 0], [1, 3], new AST("member", [1, 0], [1, 3], {
				target: new AST("identifier", [1, 0], [1, 1], "a"),
				member: "0"
			}))
		]);
	});

	test("nested numerical member", () => {
		const ast = parse("a.0.0.0");
		compareModule(ast, [
			new AST("expression", [1, 0], [1, 7], new AST("member", [1, 0], [1, 7], {
				target: new AST("member", [1, 0], [1, 5], {
					target: new AST("member", [1, 0], [1, 3], {
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
			new AST("expression", [1, 0], [1, 6], new AST("constructor", [1, 0], [1, 6], {
				target: new AST("identifier", [1, 0], [1, 3], "Obj"),
				fields: new Map(),
				generics: []
			}))
		]);
	});

	test("basic constructor with field", () => {
		const ast = parse("Obj { a: 42 }");
		compareModule(ast, [
			new AST("expression", [1, 0], [1, 13], new AST("constructor", [1, 0], [1, 13], {
				target: new AST("identifier", [1, 0], [1, 3], "Obj"),
				fields: new Map([
					["a", new AST("number", [1, 9], [1, 11], "42")]
				]),
				generics: []
			}))
		]);
	});

	test("basic constructor with multiple fields", () => {
		const ast = parse("Obj { a: 42, b: \"hi\" }");
		compareModule(ast, [
			new AST("expression", [1, 0], [1, 22], new AST("constructor", [1, 0], [1, 22], {
				target: new AST("identifier", [1, 0], [1, 3], "Obj"),
				fields: new Map([
					["a", new AST("number", [1, 9], [1, 11], "42")],
					["b", new AST("string", [1, 16], [1, 20], "hi")]
				]),
				generics: []
			}))
		]);
	});

	test("member constructor with no fields", () => {
		const ast = parse("Obj.Child {}");
		compareModule(ast, [
			new AST("expression", [1, 0], [1, 12], new AST("constructor", [1, 0], [1, 12], {
				target: new AST("member", [1, 0], [1, 9], {
					target: new AST("identifier", [1, 0], [1, 3], "Obj"),
					member: "Child"
				}),
				fields: new Map(),
				generics: []
			}))
		]);
	})
});

describe("function call expression", () => {
	test("basic call no parameters", () => {
		const ast = parse("callback()");
		compareModule(ast, [
			new AST("expression", [1, 0], [1, 10], new AST("call", [1, 0], [1, 10], {
				callee: new AST("identifier", [1, 0], [1, 8], "callback"),
				generics: [],
				arguments: []
			}))
		]);
	});

	test("basic call with 1 parameter", () => {
		const ast = parse("callback(12)");
		compareModule(ast, [
			new AST("expression", [1, 0], [1, 12], new AST("call", [1, 0], [1, 12], {
				callee: new AST("identifier", [1, 0], [1, 8], "callback"),
				generics: [],
				arguments: [
					new AST("number", [1, 9], [1, 11], "12")
				]
			}))
		]);
	});

	test("basic call with multiple parameters", () => {
		const ast = parse("callback(12, 42, 8)");
		compareModule(ast, [
			new AST("expression", [1, 0], [1, 19], new AST("call", [1, 0], [1, 19], {
				callee: new AST("identifier", [1, 0], [1, 8], "callback"),
				generics: [],
				arguments: [
					new AST("number", [1, 9], [1, 11], "12"),
					new AST("number", [1, 13], [1, 15], "42"),
					new AST("number", [1, 17], [1, 18], "8")
				]
			}))
		]);
	});

	test("call with group expression", () => {
		const ast = parse("callback((18))");
		compareModule(ast, [
			new AST("expression", [1, 0], [1, 14], new AST("call", [1, 0], [1, 14], {
				callee: new AST("identifier", [1, 0], [1, 8], "callback"),
				generics: [],
				arguments: [
					new AST("group", [1, 9], [1, 13], new AST("number", [1, 10], [1, 12], "18"))
				]
			}))
		]);
	});

	test("call with generic params empty", () => {
		const ast = parse("callback:<>()");
		compareModule(ast, [
			new AST("expression", [1, 0], [1, 13], new AST("call", [1, 0], [1, 13], {
				callee: new AST("identifier", [1, 0], [1, 8], "callback"),
				generics: [],
				arguments: []
			}))
		]);
	});

	test("call with single generic params ", () => {
		const ast = parse("callback:<i32>()");
		compareModule(ast, [
			new AST("expression", [1, 0], [1, 16], new AST("call", [1, 0], [1, 16], {
				callee: new AST("identifier", [1, 0], [1, 8], "callback"),
				generics: [
					parseType("i32")
				],
				arguments: []
			}))
		]);
	});

	test("call with multiple generic params ", () => {
		const ast = parse("callback:<i32, i32, u32>()");
		compareModule(ast, [
			new AST("expression", [1, 0], [1, 26], new AST("call", [1, 0], [1, 26], {
				callee: new AST("identifier", [1, 0], [1, 8], "callback"),
				generics: [
					parseType("i32"),
					parseType("i32"),
					parseType("u32")
				],
				arguments: []
			}))
		]);
	});
})





function parse(str: string): AST {
	return parser.parseProgram(str);
}

function parseType(str: string) {
	return parser.parseType(createCharIterator(str));
}

function createCharIterator(str: string) {
	return new ControlledIterator(parser.scanner.scan(str, ""));
}

function compareModule(source: AST, expected_stmts: AST[]) {
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