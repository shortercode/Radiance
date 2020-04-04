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

const { PerformanceObserver, performance } = require('perf_hooks');

async function test () {
	performance.mark("mark_1");
	const ast = Parser.parseProgram(`
	func add (a: f64, b: f64) -> f64 {
			let c: f64 = a + b
			c
	}

	func sub (a: f64, b: f64) -> f64 {
		{
			a
			a
			a - b
		}
	}

	func double(a: f64) -> f64 {
		add(a, a)
	}

	func noop(a: boolean) {
		a
	}

	export sub
	export double
	export noop

	`, "test program");
	performance.mark("mark_2");
	// console.log("AST:");
	// console.log(JSON.stringify(ast, null, 2));
	const wast = Compiler(ast);
	performance.mark("mark_3");
	// console.log("WAST:");
	// console.log(JSON.stringify(wast, null, 2));
	const binary = Serializer(wast);
	performance.mark("mark_4");

	const obs = new PerformanceObserver((items: any) => {
		for (const entry of items.getEntries()) {
			console.log(`${entry.name} ${entry.duration}`);
		}
	});
	obs.observe({ entryTypes: ['measure'] });

	performance.measure("Parse", "mark_1", "mark_2");
	performance.measure("Compile", "mark_2", "mark_3");
	performance.measure("Serialise", "mark_3", "mark_4");
	performance.measure("Overall", "mark_1", "mark_4");
	// console.log("Binary:");
	console.log(Buffer.from(binary).toString("hex"))

	const { module, instance } = await WebAssembly.instantiate(binary);
	
	const { double, sub } = instance.exports;

	console.log((double as any)(13));
	console.log((sub as any)(14, 8))
	// console.log(add(12, 30));
}

main();