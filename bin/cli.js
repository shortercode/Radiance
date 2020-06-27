#!/usr/bin/env node

const { execute_file, compile_file } = require("../dist/radiance.js");
const fs = require("fs").promises;
const path = require("path");

const VERSION = "0.2.0";

main();

async function main () {
	try {
		const options = read_arguments(process.argv.slice(2));
		if (options.help) {
			console.log(help_message());
			return;
		}

		if (options.run) {
			console.log(`Executing ${options.input}`);
			const exps = await execute_file(options.input);
			if (options.memdump) {
				await fs.writeFile(options.memdump, Buffer.from(exps.memory.buffer).toString("hex"));
			}
		}
		else {
			console.log(`Compiling ${options.input} to ${options.output}`);
			const binary = await compile_file(options.input);
			if (options.hexdump) {
				console.log(Buffer.from(binary).toString("hex"));
			}
			await fs.writeFile(options.output, binary);
		}
	}
	catch (e) {
		console.log(`Error: ${e.message}`);
		console.log(help_message());
	}
}

function parse_arguments (argv) {
	const args = [];

	for (const arg of argv) {
		if (arg.startsWith("--")) {
			args.push({
				type: "option",
				name: arg.slice(2)
			});
		}
		else if (arg.startsWith("-")) {
			for (const ch of arg.slice(1)) {
				args.push({
					type: "option",
					name: ch
				});
			}
		}
		else {
			args.push({
				type: "argument",
				value: arg
			});
		}
	}

	return args;
}

function read_arguments (argv) {
	let debug = false;
	let run = false;
	let help = false;
	let hexdump = false;

	let input = null;
	let output = null;
	let memdump = null;

	const aliases = new Map([
		["i", "input"],
		["o", "output"],
		["r", "run"],
		["h", "help"]
	]);

	const args = parse_arguments(argv);

	while (args.length) {
		const current_part = args.shift();
		if (current_part.type === "option") {
			let value = current_part.name;
			if (aliases.has(value)) {
				value = aliases.get(value);
			}
			switch (value) {
				case "input": {
					const next_part = args.shift();
					if (!next_part || next_part.type !== "argument") {
						throw new Error("expected the name of an input file");
					}
					input = next_part.value;
					break;
				}
				case "output": {
					const next_part = args.shift();
					if (!next_part || next_part.type !== "argument") {
						throw new Error("expected the name of an output file");
					}
					output = next_part.value;
					break;
				}
				case "debug": {
					debug = true;
					break;
				}
				case "bindump": {
					hexdump = true;
					break;
				}
				case "memdump": {
					const next_part = args.shift();
					if (!next_part || next_part.type !== "argument") {
						throw new Error("expected the name of an memdump file");
					}
					memdump = next_part.value;
					break;
				}
				case "run": {
					run = true;
					break;
				}
				case "help": {
					help = true;
					break;
				}
				default: {
					throw new Error(`unexpected option ${value}`);
					break;
				}
			}
		}
		else if (input === null) {
			input = current_part.value;
		}
		else {
			throw new Error("expected an option");
		}
	}

	if (help === false) {
		if (input === null) {
			throw new Error("please specify an input file");
		}
		if (run === false && output === null) {
			const { dir, name } = path.parse(input);
			output = path.join(dir, name) + ".wasm";
		}
	}

	return {
		input,
		output,
		debug,
		hexdump,
		memdump,
		run
	}
}

function help_message () {
return `
	Radiance Lang version: ${VERSION}
	Syntax: radiance [options] [file]

	Examples: radiance hello.rad
						radiance --output file.wasm file.rad
						radiance --run file.rad

	Options:
	-r, --run			Compile then execute the input file.
	-h, --help		Print this message.
	-o, --output	Emit output to file.
	-i, --input		
`;
}