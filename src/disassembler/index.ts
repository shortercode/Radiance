class ByteReader {
	private offset: number = 0
	private readonly view: DataView
	readonly length: number

	constructor (bytes: ArrayBuffer) {
		this.view = new DataView(bytes);
		this.length = this.view.byteLength;
	}

	hasReachedEnd () {
		return this.offset >= this.length;
	}

	skipBytes (count: number) {
		if (this.offset + count > this.length)
			throw new Error("Out of range");
		this.offset += count;
	}

	readUint8 () {
		if (this.offset + 1 > this.length)
			throw new Error("Out of range");
		const value = this.view.getUint8(this.offset);
		this.offset += 1;
		return value;
	}

	readUint32 () {
		if (this.offset + 4 > this.length)
			throw new Error("Out of range");
		const value = this.view.getUint32(this.offset);
		this.offset += 4;
		return value;
	}
	
	readFloat32 () {
		if (this.offset + 4 > this.length)
			throw new Error("Out of range");
		const value = this.view.getFloat32(this.offset);
		this.offset += 4;
		return value;
	}

	readFloat64 () {
		if (this.offset + 8 > this.length)
			throw new Error("Out of range");
		const value = this.view.getFloat64(this.offset);
		this.offset += 8;
		return value;
	}

	readUVint (maximumBytes: number = 5) {
		let result = 0;
		let shift = 0;
		for (let i = 0; i < maximumBytes; i++) {
			const byte = this.readUint8();
			result |= (byte & 127) << shift;
			if ((byte & 128) == 0)
				break;
			shift += 7;
		}
		return result;
	}

	readString (byteLength: number): string {
		if (this.offset + byteLength > this.length)
			throw new Error("Out of range");
		// NOTE Node.js only
		const buffer = Buffer.from(this.view.buffer, this.offset, byteLength);
		this.offset += byteLength;
		return buffer.toString("utf8");
	}

	hexdump (pre: number = -8, post: number = 8) {
		const words = [];
		{
			let padding = Math.max(0, -(this.offset + pre));
			while (padding--) {
				words.push("__");
			}
		}
		{
			const start = Math.max(0, this.offset + pre);
			const end = Math.min(this.length, this.offset + post);

			for (let i = start; i < end; i++) {
				if (i === this.offset)
					words.push("@")
				words.push(this.view.getUint8(i).toString(16).padStart(2, "0"));
			}
		}
		{
			let padding = Math.max(0, (this.offset + post) - this.length);
			while (padding--) {
				words.push("__");
			}
		}
		return words.join(" ");
	}

	skipUVint (maximumBytes: number = 10) {
		for (let i = 0; i < maximumBytes; i++) {
			const byte = this.readUint8();
			if ((byte & 128) == 0)
				break;
		}
	}
	
	pushBack () {
		if (this.offset <= 0)
			throw new Error("Out of range");
		this.offset -= 1;
	}

	readBuffer (count: number) {
		if (this.offset + count > this.length)
			throw new Error("Out of range");
		const value = new Uint8Array(this.view.buffer, this.offset, count);
		this.offset += count;
		return value;
	}
}

type ValueType = "i32" | "i64" | "f32" | "f64";

// 0x45...0xC0
const numericInstructions = [
	"i32.eqz",
	"i32.eq",
	"i32.ne",
	"i32.lt_s",
	"i32.lt_u",
	"i32.gt_s",
	"i32.gt_u",
	"i32.le_s",
	"i32.le_u",
	"i32.ge_s",
	"i32.ge_u",

	"i64.eqz",
	"i64.eq",
	"i64.ne",
	"i64.lt_s",
	"i64.lt_u",
	"i64.gt_s",
	"i64.gt_u",
	"i64.le_s",
	"i64.le_u",
	"i64.ge_s",
	"i64.ge_u",

	"f32.eq",
	"f32.ne",
	"f32.lt",
	"f32.gt",
	"f32.le",
	"f32.ge",

	"f64.eq",
	"f64.ne",
	"f64.lt",
	"f64.gt",
	"f64.le",
	"f64.ge",

	"i32.clz",
	"i32.ctz",
	"i32.popcnt",
	"i32.add",
	"i32.sub",
	"i32.mul",
	"i32.div_s",
	"i32.div_u",
	"i32.rem_s",
	"i32.rem_u",
	"i32.and",
	"i32.or",
	"i32.xor",
	"i32.shl",
	"i32.shr_s",
	"i32.shr_u",
	"i32.rotl",
	"i32.rotr",

	"i64.clz",
	"i64.ctz",
	"i64.popcnt",
	"i64.add",
	"i64.sub",
	"i64.mul",
	"i64.div_s",
	"i64.div_u",
	"i64.rem_s",
	"i64.rem_u",
	"i64.and",
	"i64.or",
	"i64.xor",
	"i64.shl",
	"i64.shr_s",
	"i64.shr_u",
	"i64.rotl",
	"i64.rotr",

	"f32.abs",
	"f32.neg",
	"f32.ceil",
	"f32.floor",
	"f32.trunc",
	"f32.nearest",
	"f32.sqrt",
	"f32.add",
	"f32.sub",
	"f32.mul",
	"f32.div",
	"f32.min",
	"f32.max",
	"f32.copysign",

	"f64.abs",
	"f64.neg",
	"f64.ceil",
	"f64.floor",
	"f64.trunc",
	"f64.nearest",
	"f64.sqrt",
	"f64.add",
	"f64.sub",
	"f64.mul",
	"f64.div",
	"f64.min",
	"f64.max",
	"f64.copysign",

	"i32.wrap_i64",
	"i32.trunc_f32_s",
	"i32.trunc_f32_u",
	"i32.trunc_f64_s",
	"i32.trunc_f64_u",
	"i64.extend_i32_s",
	"i64.extend_i32_u",
	"i64.trunc_f32_s",
	"i64.trunc_f32_u",
	"i64.trunc_f64_s",
	"i64.trunc_f64_u",
	"f32.convert_i32_S",
	"f32.convert_i32_u",
	"f32.convert_i64_s",
	"f32.convert_i64_u",
	"f32.demote_f64",
	"f64.convert_i32_S",
	"f64.convert_i32_u",
	"f64.convert_i64_s",
	"f64.convert_i64_u",
	"f64.promote_f32",
	"i32.reinterpret_f32",
	"i64.reinterpret_i64",
	"f32.reinterpret_i32",
	"f64.reinterpret_is64",
];

function readValueType (byteReader: ByteReader): ValueType|null {
	switch (byteReader.readUint8()) {
		case 0x7F: return "i32";
		case 0x7E: return "i64";
		case 0x7D: return "f32";
		case 0x7C: return "f64";
		default: return null;
	}
}

function readBlockType (byteReader: ByteReader): ValueType|null {
	switch (byteReader.readUint8()) {
		case 0x7F: return "i32";
		case 0x7E: return "i64";
		case 0x7D: return "f32";
		case 0x7C: return "f64";
		case 0x40: return null;
		default: throw new Error(`Invalid block type`);
	}
}

function readLimit (byteReader: ByteReader): [number, number] {
	const flag = byteReader.readUint8();
	const min = byteReader.readUVint();
	let max = Infinity; // TODO find out what the actual default limit is
	if (flag === 1) { // maximum present
		max = byteReader.readUVint();
	}
	else if (flag !== 0) {
		throw new Error("Invalid limit flag");
	}
	return [min, max];
}

function readMemarg (byteReader: ByteReader): [number, number] {
	return [byteReader.readUVint(), byteReader.readUVint()];
}

function readName (byteReader: ByteReader): string {
	const byteLength = byteReader.readUVint();
	return byteReader.readString(byteLength);
}

type Expression = Array<Instruction>

class Instruction {
	readonly op: string
	constructor (opcode: string) {
		this.op = opcode;
	}
	toString () {
		return `(${this.op})`;
	}
}

class BlockInstruction extends Instruction {
	readonly block: Expression
	readonly type: ValueType | null
	constructor (opcode: string, type: ValueType|null, block: Expression) {
		super(opcode);
		this.type = type;
		this.block = block;
	}
	toString () {
		return `(${this.op} ${this.type === null ? "void" : this.type} ${this.block.toString()})`;
	}
}

class ConditionalInstruction extends Instruction {
	readonly primary: Expression
	readonly secondary: Expression | null
	readonly type: ValueType | null
	constructor(type: ValueType | null, primary: Expression, secondary: Expression | null) {
		super("if");
		this.type = type;
		this.primary = primary;
		this.secondary = secondary;
	}

	toString () {
		return `(${this.op} ${this.type === null ? "void" : this.type} ${this.primary.toString()} ${this.secondary ? this.secondary.toString() : ""})`;
	}
}

class ValueInstruction extends Instruction {
	readonly value: number
	constructor (op: string, id: number) {
		super (op);
		this.value = id;
	}

	toString() {
		return `(${this.op} ${this.value})`;
	}
}

class MemoryInstruction extends Instruction {
	readonly align: number
	readonly offset: number
	constructor (opcode: string, [align, offset]: [number, number]) {
		super(opcode);
		this.align = align;
		this.offset = offset;
	}

	toString() {
		return `(${this.op} ${this.align} ${this.offset})`;
	}
}

class BreakTableInstruction extends Instruction {
	readonly entries: Array<number>
	readonly fallback: number
	constructor (entries: Array<number>, fallback: number) {
		super("br_table");
		this.entries = entries;
		this.fallback = fallback;
	}

	toString() {
		return `(${this.op} (${this.entries.toString}) ${this.fallback})`;
	}
}

function readControlInstruction(opcode: number, byteReader: ByteReader): Instruction|null {
	/*
		Expected range 0x00...0x12

		0x05...0x0C is a reserved range

		under the correct circumstances 0x05 is used as "else" in
		control statements

		0x0B is used as "end" for multiple expression type, but
		has no meaning by itself
	*/
	switch (opcode) {
		case 0x00: return new Instruction("unreachable");
		case 0x01: return new Instruction("nop");
		case 0x02: {
			const type = readBlockType(byteReader);
			const expr = readExpression(byteReader);
			return new BlockInstruction("block", type, expr);
		}
		case 0x03: {
			const type = readBlockType(byteReader);
			const expr = readExpression(byteReader);
			return new BlockInstruction("loop", type, expr);
		}
		case 0x04: {
			const type = readBlockType(byteReader);
			const primary = readUnendedExpression(byteReader);
			let secondary: Expression | null = null;
			const nextbyte = byteReader.readUint8(); 
			if (nextbyte === 0x05) {
				secondary = readExpression(byteReader);
			}
			else if (nextbyte !== 0x0B) {
				throw new Error("Expected end of expression marker");
			}
			return new ConditionalInstruction(type, primary, secondary);
		}
		case 0x05:
		case 0x0B:
			byteReader.pushBack();
			return null;
		case 0x0C: {
			const id = byteReader.readUVint();
			return new ValueInstruction("br", id);
		}
		case 0x0D: {
			const id = byteReader.readUVint();
			return new ValueInstruction("br_if", id);
		}
		case 0x0E: {
			const length = byteReader.readUVint();
			const entries = [];
      for (let i = 0; i < length; i++) {
				const labelid = byteReader.readUVint();
				entries.push(labelid);
			}
			const fallback = byteReader.readUVint();
			return new BreakTableInstruction(entries, fallback);
		}
		case 0x0F: return new Instruction("return");
		case 0x10: {
			const id = byteReader.readUVint();
			return new ValueInstruction("call", id);
		}
		case 0x11: {
			const id = byteReader.readUVint();
			assert(byteReader.readUint8() === 0x00, "Expected 0 byte");
			return new ValueInstruction("call_indirect", id);
		}
		default: 
			throw new Error("Illegal reserved opcode");
	}
}

function readNumericInstruction(opcode: number, byteReader: ByteReader): Instruction {
	opcode -= 0x45;
	if (opcode < 0 || opcode >= numericInstructions.length)
		throw new Error("Invalid numeric opcode");
	const op = numericInstructions[opcode];
	return new Instruction(op);
}

function readConstNumericInstruction(opcode: number, byteReader: ByteReader): Instruction {
	switch (opcode) {
		case 0x41: {
			const value = byteReader.readUVint();
			return new ValueInstruction("i32.const", value);
		}
		case 0x42: {
			// WARN we cannot read a full size LEB128 i64 using JS for multiple
			// reasons so we just skip over it instead. 
			byteReader.skipUVint();
			return new ValueInstruction("i64.const", 0);
		}
		case 0x43: {
			const value = byteReader.readFloat32();
			return new ValueInstruction("f32.const", value);
		}
		case 0x44: {
			const value = byteReader.readFloat64();
			return new ValueInstruction("f64.const", value);
		}
		default: throw new Error("illegal reserved opcode");
	}
}

function readVariableInstruction(opcode: number, byteReader: ByteReader): Instruction {
	const id = byteReader.readUVint();
	if (opcode < 0x20 || opcode > 0x24)
		throw new Error("Invalid opcode");

	const op = [
		"local.get",
		"local.set",
		"local.tee",
		"global.get",
		"global.set"
	][opcode - 0x20];

	return new ValueInstruction(op, id);
}

function readParametricInstruction(opcode: number, byteReader: ByteReader): Instruction {
	if (opcode === 0x1A) return new Instruction("drop");
	if (opcode === 0x1B) return new Instruction("select");
	throw new Error("invalid instruction opcode");
}

function readMemoryInstruction(opcode: number, byteReader: ByteReader): Instruction {
	switch (opcode) {
		case 0x28: return new MemoryInstruction("i32.load", readMemarg(byteReader));
		case 0x29: return new MemoryInstruction("i64.load", readMemarg(byteReader));
		case 0x2A: return new MemoryInstruction("f32.load", readMemarg(byteReader));
		case 0x2B: return new MemoryInstruction("f64.load", readMemarg(byteReader));

		case 0x2C: return new MemoryInstruction("i32.load8_s", readMemarg(byteReader));
		case 0x2D: return new MemoryInstruction("i32.load8_u", readMemarg(byteReader));
		case 0x2E: return new MemoryInstruction("i32.load16_s", readMemarg(byteReader));
		case 0x2F: return new MemoryInstruction("i32.load16_u", readMemarg(byteReader));

		case 0x30: return new MemoryInstruction("i64.load8_s", readMemarg(byteReader));
		case 0x31: return new MemoryInstruction("i64.load8_u", readMemarg(byteReader));
		case 0x32: return new MemoryInstruction("i64.load16_s", readMemarg(byteReader));
		case 0x33: return new MemoryInstruction("i64.load16_u", readMemarg(byteReader));
		case 0x34: return new MemoryInstruction("i64.load32_s", readMemarg(byteReader));
		case 0x35: return new MemoryInstruction("i64.load32_u", readMemarg(byteReader));
	
		case 0x36: return new MemoryInstruction("i32.store", readMemarg(byteReader));
		case 0x37: return new MemoryInstruction("i64.store", readMemarg(byteReader));
		case 0x38: return new MemoryInstruction("f32.store", readMemarg(byteReader));
		case 0x39: return new MemoryInstruction("f64.store", readMemarg(byteReader));

		case 0x3A: return new MemoryInstruction("i32.store8", readMemarg(byteReader));
		case 0x3B: return new MemoryInstruction("i32.store16", readMemarg(byteReader));
		case 0x3C: return new MemoryInstruction("i64.store8", readMemarg(byteReader));
		case 0x3D: return new MemoryInstruction("i64.store16", readMemarg(byteReader));
		case 0x3E: return new MemoryInstruction("i64.store32", readMemarg(byteReader));
		
		case 0x3F: {
			assert(byteReader.readUint8() === 0x00, "Expected zero byte");
			return new Instruction("memory.size");
		}
		case 0x40: {
			assert(byteReader.readUint8() === 0x00, "Expected zero byte");
			return new Instruction("memory.grow");
		}
		default:
			throw new Error("illegal reserved opcode");
	}
}

function readInstruction(byteReader: ByteReader): Instruction|null  {
	const opcode = byteReader.readUint8();

	if (opcode < 0x12) {
		return readControlInstruction(opcode, byteReader);
	}
	else if (opcode < 0x1A) {
		throw new Error("Illegal reserved opcode");
	}
	else if (opcode < 0x1C) {
		return readParametricInstruction(opcode, byteReader);
	}
	else if (opcode < 0x20) {
		throw new Error("Illegal reserved opcode");
	}
	else if (opcode < 0x25) {
		return readVariableInstruction(opcode, byteReader);
	}
	else if (opcode < 0x28) {
		throw new Error("Illegal reserved opcode");
	}
	else if (opcode < 0x41) {
		return readMemoryInstruction(opcode, byteReader);
	}
	else if (opcode < 0x45) {
		return readConstNumericInstruction(opcode, byteReader);
	}
	else if (opcode < 0xC0) {
		return readNumericInstruction(opcode, byteReader);
	}
	else {
		throw new Error("Illegal reserved opcode");
	}
}

function readExpression (byteReader: ByteReader): Expression {
	const expr = readUnendedExpression(byteReader);
	assert(byteReader.readUint8() === 0x0B, "Invalid expression");
	return expr;
}

function readUnendedExpression (byteReader: ByteReader): Expression {
	const instructions: Expression = [];
	while (true) {
		const instr = readInstruction(byteReader);
		if (instr === null)
			break;
		else
			instructions.push(instr);
	}
	return instructions;
}

function disassembleWASMBinary (bytes: ArrayBuffer) {
	const byteReader = new ByteReader(bytes);

	const magicNumber = byteReader.readUint32();
	const versionNumber = byteReader.readUint32();

	assert(magicNumber === 0x0061736D, `Incorrect magic number ${magicNumber}`);
	assert(versionNumber === 0x01000000, `Incorrect version number ${versionNumber}`);
	
	while (byteReader.hasReachedEnd() === false) {
		const sectionID = byteReader.readUint8();
		const sectionLength = byteReader.readUVint();

		switch (sectionID) {
			case 0: {// custom section type - should ignore
				byteReader.skipBytes(sectionLength);
				break;
			}
			case 1: { // type section
				const typeCount = byteReader.readUVint();

				for (let i = 0; i < typeCount; i++) {
					const parameters = [];
					const results = [];
					
					assert(byteReader.readUint8() === 0x60, "Function type magic number missing");
					const parameterCount = byteReader.readUVint();
					for (let j = 0; j < parameterCount; j++) {
						const type = readValueType(byteReader);
						assert(type !== null, "Function parameter has invalid value type");
						parameters.push(type);
					}
					const resultCount = byteReader.readUVint();
					if (resultCount === 1) {
						const type = readValueType(byteReader);
						assert(type !== null, "Function result has invalid value type");
						results.push(type);
					}
					else if (resultCount !== 0) {
						throw new Error("Functions can only have 0 or 1 result values at this time");
					}

					console.log(`Read type (${parameters.join(", ")}) -> ${results[0] || "void"}`);

					// TODO record function signatures
				}
				break;
			}
			case 2: { // import section
				const importCount = byteReader.readUVint();
				for (let i = 0; i < importCount; i++) {
					const module = readName(byteReader);
					const name = readName(byteReader);
					const type = byteReader.readUint8();
					
					switch (type) {
						case 0: {
							const typeid = byteReader.readUVint();
							console.log(`Read import ${module}.${name} type: ${typeid}`);
							break;
						}
						case 1: {
							assert( byteReader.readUint8() === 0x70, `Table type magic number invalid`);
							const [min, max] = readLimit(byteReader);
							console.log(`Read import ${module}.${name} table: ${min}...${max}`);
							break;
						}
						case 2: {
							const [min, max] = readLimit(byteReader);
							console.log(`Read import ${module}.${name} memory: ${min}...${max}`);
							break;
						}
						case 3: {
							const type = readValueType(byteReader);
							assert(type !== null, "Global has invalid value type");
							const flag = byteReader.readUint8();
							let mutable = false;
							if (flag === 1) {
								mutable = true;
							}
							else if (flag !== 0) {
								throw new Error("Invalid global mutablity flag");
							}

							console.log(`Read import ${module}.${name} global: ${mutable ? "mut " : ""} ${type}`);
							break;
						}
						default: throw new Error("invalid import type");
					}

				}
				break;
			}
			case 3: { // function section
				const functionCount = byteReader.readUVint();
				for (let i = 0; i < functionCount; i++) {
					const typeID = byteReader.readUVint();
					console.log(`Read function signature index ${typeID}`);

					// TODO lookup function signatures
				}
				break;
			}
			case 4: { // table section
				const tableCount = byteReader.readUVint();
				for (let i = 0; i < tableCount; i++) {
					assert( byteReader.readUint8() === 0x70, `Table type magic number invalid`);
					const [min, max] = readLimit(byteReader);
					console.log(`Read table entry ${min}...${max}`);
				}
				break;
			}
			case 5: { // memory section
				const memCount = byteReader.readUVint();
				for (let i = 0; i < memCount; i++) {
					const [min, max] = readLimit(byteReader);
					console.log(`Read memory entry ${min}...${max}`);
				}
				break;
			}
			case 6: { // global section
				const globalCount = byteReader.readUVint();
				for (let i = 0; i < globalCount; i++) {
					const type = readValueType(byteReader);
					assert(type !== null, "Global has invalid value type");
					const flag = byteReader.readUint8();
					let mutable = false;
					if (flag === 1) {
						mutable = true;
					}
					else if (flag !== 0) {
						throw new Error("Invalid global mutablity flag");
					}

					const expr = readExpression(byteReader);
					
					console.log(`Read global ${mutable ? "mut " : ""}let = ${expr}`);
				}
				break;
			}
			case 7: { // export section
				const exportCount = byteReader.readUVint();
				for (let i = 0; i < exportCount; i++) {
					const name = readName(byteReader);
					const type = byteReader.readUint8();

					assert(type >= 0 && type < 4, "invalid export type");

					const id = byteReader.readUVint();
					const typename = ["func", "table", "mem", "global"][type];

					console.log(`Read export ${name} ${typename}[${id}]`);
				}
				break;
			}
			case 8: { // start section
				const funcid = byteReader.readUVint();
				console.log(`Read start function ${funcid}`);
				break;
			}
			case 9: { // element section
				const elementCount = byteReader.readUVint();
				for (let i = 0; i < elementCount; i++) {
					const tableID = byteReader.readUVint();
					const offsetExpression = readExpression(byteReader);
					const initFnList = [];
					
					const initFnCount = byteReader.readUVint();
					for (let ii = 0; ii < initFnCount; ii++) {
						initFnList.push(byteReader.readUVint());
					}

					console.log(`Read element entry Table: ${tableID} Offset: ${offsetExpression} Entries: ${initFnList}`);
				}
				break;
			}
			case 10: { // code section
				// console.log(byteReader.hexdump(0, sectionLength));
				const codeEntries = byteReader.readUVint();
				for (let i = 0; i < codeEntries; i++) {
					const size = byteReader.readUVint();
					// NOTE size is not required for reading, it exists to
					// allow you to skip the function body while reading the binary
					const localCount = byteReader.readUVint();
					const locals = [];
					for (let ii = 0; ii < localCount; ii++) {
						const count = byteReader.readUVint();
						const type = readValueType(byteReader);
						locals.push([count, type]);
					}

					const expr = readExpression(byteReader);

					console.log(`Read code block (${locals.join()}) -> ${expr}`);
				}
				break;
			}
			case 11: { // data section
				const segmentCount = byteReader.readUVint();

				for (let i = 0; i < segmentCount; i++) {
					const id = byteReader.readUVint();
					const expr = readExpression(byteReader);
					const dataLength = byteReader.readUVint();
					const data = byteReader.readBuffer(dataLength);

					console.log(`Read data segment Mem: ${id} Offset: ${expr} Data: Buffer(${data.length})`);
				}
				break;
			}
		}
	}
} 

function assert (test: boolean, message: string) {
	if (test === false)
		throw new Error(message);
}

const fs = require("fs");


function readArguments () {
  const filename = process.argv[2];

	return {
    filename
  };
}

async function readFile(filename: string) {
	const buffer = await fs.promises.readFile(filename);
	/*
		NOTE this works around a specific quirk of Node.js
		where the contents of small files are placed in a shared
		ArrayBuffer. As we consume the entire ArrayBuffer we must
		copy the contents to a new ArrayBuffer to ensure the
		file is the sole contents of the ArrayBuffer
	*/
	const arrayBuffer = buffer.buffer;
	if (buffer.length !== arrayBuffer.byteLength) {
		const start = buffer.byteOffset;
		return arrayBuffer.slice(start, start + buffer.length);
	}
	return arrayBuffer;
}

function tryDisassembleWASMBinary (bytes: ArrayBuffer) {
	try {
		disassembleWASMBinary(bytes);
	}
	catch (error) {
		console.log(error.stack);
	}
}

async function main () {
	const {
		filename
	} = readArguments();

	const bytes = (await readFile(filename));

	tryDisassembleWASMBinary(bytes);
}

main()