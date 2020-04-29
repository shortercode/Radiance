import Parser from "./parser/index";
import Compiler from "./compiler/index";
import Serializer from "./serializer/index";

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

async function parseFile (name: string) {
	const str = await fs.readFile(name, "utf8");
	return  Parser.parseProgram(str, name);
}

async function test () {
	performance.mark("mark_1");
	const ast = await parseFile("test.atium");
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
	const importObject = {
		"imports": {
			log_i32: (v:number) => console.log(`i32: ${v}`),
			log_f32: (v:number) => console.log(`f32: ${v}`),
			set_color: (r:number, g:number, b:number) => console.log(`rgb(${r},${g},${b})`),
			draw_rect: (x:number,y:number,width:number,height:number) => console.log(`rect(${x},${y},${width},${height})`)
		}
	};
	const { module, instance } = await WebAssembly.instantiate(binary, importObject);
	
	const mod = instance.exports;

	// console.log((double as any)(13));
	// console.log((sub as any)(14, 8))
	// console.log(add(12, 30));
	// const factorial = mod.factorial as (a: number) => number
	const point = mod.point as (x: number, y: number) => number
	const point_x = mod.point_x as (p: number) => number
	const point_y = mod.point_y as (p: number) => number
	const array_test = mod.array_test as (p: number) => number
	const main = mod.main as () => void
	const memory = mod.memory as WebAssembly.Memory;

	main();

	for (let i = 0; i < 10; i++) {
		const pt = point(691, 8888);
		const a = point_x(pt);
		const b = point_y(pt);
		const c = array_test(i);
		console.log(`${c} = ${a}, ${b}`);
	}

	const result = new Uint8Array(memory.buffer, 0, 80);

	console.log(Buffer.from(result).toString("hex"))
}

main();