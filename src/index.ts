import Parser from "./parser/index.js";
import Compiler from "./compiler/index.js";
import Serializer from "./serializer/index.js";

async function main () {
	try {
		await test();
	}
	catch (e) {
		console.error(e.stack);
	}
}

async function test () {
	const ast = Parser.parseProgram(`
	func add (a: f64, b: f64) -> f64 {
			let c: f64 = a + b
			c
	}

	func sub (a: f64, b: f64) -> f64 {
		a - b
	}

	func double(a: f64) -> f64 {
		add(a, a)
	}

	export sub
	export double

	`, "test program");

	console.log("AST:");
	console.log(JSON.stringify(ast, null, 2));
	const wast = Compiler(ast);
	console.log("WAST:");
	console.log(JSON.stringify(wast, null, 2));
	const binary = Serializer(wast);
	console.log("Binary:");
	console.log(binary)

	const { module, instance } = await WebAssembly.instantiate(binary);
	
	const { double, sub } = instance.exports;

	console.log((double as any)(13));
	console.log((sub as any)(14, 8))
	// console.log(add(12, 30));
}

main();