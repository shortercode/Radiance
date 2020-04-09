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
const fs = require("fs").promises;

async function test () {
	performance.mark("mark_1");
	const ast = Parser.parseProgram(`
	func factorial (count: f64) -> f64 {
    let result: f64 = 1;
    let i: f64 = 0
    while i <= count {
        i = i + 1
        result = result * i
    }
	}

	func fibonacci(n: f64) -> f64 {
		if n <= 1 {
			n
			}
			else {
					fibonacci(n - 2) + fibonacci(n - 1)
			}
	}

	export factorial
	export fibonacci
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
	console.log(`Output size ${binary.byteLength}`);
	console.log(Buffer.from(binary).toString("hex"))

	fs.writeFile("test.wasm", binary);
	const { module, instance } = await WebAssembly.instantiate(binary);
	
	const { double, sub, fibonacci, count, factorial } = instance.exports;

	// console.log((double as any)(13));
	// console.log((sub as any)(14, 8))
	// console.log(add(12, 30));

	for (let i = 0; i < 10; i++) {
		console.log((factorial as any)(i));
	}
}

main();