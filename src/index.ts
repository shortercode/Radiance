import Parser from "./parser/index";
import Compiler from "./compiler/index";
import Serializer from "./serializer/index";

const fs = require("fs").promises;
const { PerformanceObserver, performance } = require('perf_hooks');

export function debug_compile_string (source: string, filename: string) {
	performance.mark("mark_1");
	const ast = Parser.parseProgram(source, filename);
	performance.mark("mark_2");
	const wast = Compiler(ast);
	performance.mark("mark_3");
	const binary = Serializer(wast);
	performance.mark("mark_4");

	const obs: PerformanceObserver = new PerformanceObserver((list: PerformanceObserverEntryList) => {
		const lines = list.getEntries().map((entry: PerformanceEntry) => `${entry.name}: ${entry.duration}`);
		console.log(lines.join("\n"));
	});

	obs.observe({ entryTypes: ['measure'], buffered: true });

	performance.measure("Parse", "mark_1", "mark_2");
	performance.measure("Compile", "mark_2", "mark_3");
	performance.measure("Serialise", "mark_3", "mark_4");
	performance.measure("Overall", "mark_1", "mark_4");

	obs.disconnect();

	return binary;
}

export async function debug_compile_file (filename: string) {
	const str = await fs.readFile(name, "utf8");
	return debug_compile_string(str, filename);
}

export async function debug_execute_string (source: string, import_object: { [key: string]: Function } = {}) {
	const binary = debug_compile_string(source, "");
	const { instance } = await WebAssembly.instantiate(binary, { "imports": import_object });
	
	return instance.exports;
}

export async function debug_execute_file (filename: string, import_object: { [key: string]: Function } = {}) {
	const binary = await compile_file(filename);
	const { instance } = await WebAssembly.instantiate(binary, { "imports": import_object });
	
	return instance.exports;
}

export function compile_string (source: string, filename: string) {
	const ast = Parser.parseProgram(source, filename);
	const wast = Compiler(ast);
	return Serializer(wast);

}

export async function compile_file (filename: string) {
	const str = await fs.readFile(name, "utf8");
	return compile_string(str, filename);
}

export async function execute_string (source: string, import_object: { [key: string]: Function } = {}) {
	const binary = compile_string(source, "");
	const { instance } = await WebAssembly.instantiate(binary, { "imports": import_object });
	
	return instance.exports;
}

export async function execute_file (filename: string, import_object: { [key: string]: Function } = {}) {
	const binary = await compile_file(filename);
	const { instance } = await WebAssembly.instantiate(binary, { "imports": import_object });
	
	return instance.exports;
}