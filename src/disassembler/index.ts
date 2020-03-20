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

function readControlInstruction(opcode: number, byteReader: ByteReader) {
    /*
        Expected range 0x00...0x12

        0x05...0x0C is a reserved range

        under the correct circumstances 0x05 is used as "else" in
        control statements

        0x0B is used as "end" for multiple expression type, but
        has no meaning by itself
    */
}

function readNumericInstruction(opcode: number, byteReader: ByteReader) {
    opcode -= 0x45;
    if (opcode < 0 || opcode >= numericInstructions.length)
        throw new Error("Invalid numeric opcode");
    return numericInstructions[opcode];
}

function readInstruction(byteReader: ByteReader) {
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
}

function readExpression (byteReader: ByteReader) {
    const instructions = [];
    while (true) {
        const instr = readInstruction(byteReader);

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
                NOT_IMPLEMENTED("import section");
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
                }
                break;
            }
            case 7: { // export section
                NOT_IMPLEMENTED("export section");
            }
            case 8: { // start section
                NOT_IMPLEMENTED("start section");
            }
            case 9: { // element section
                NOT_IMPLEMENTED("element section");
            }
            case 10: { // code section
                NOT_IMPLEMENTED("code section");
            }
            case 11: { // data section
                NOT_IMPLEMENTED("data section");
            }
        }
    }
} 

function assert (test: boolean, message: string) {
    if (test === false)
        throw new Error(message);
}

function readArguments () {
    const filename = process.argv[2];

    return {
        filename
    };
}

const fs = require("fs");

async function readFile(filename) {
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

function NOT_IMPLEMENTED (label: string = "unknown") {
    throw new Error(`Not implemented (${label})`);
}

function tryDisassemblyWASMBinary (bytes: ArrayBuffer) {
    try {
        disassembleWASMBinary(bytes);
    }
    catch (error) {
        console.log(error.message);
    } 
}

async function main () {
    const {
        filename
    } = readArguments();

    const bytes = (await readFile(filename));

    tryDisassemblyWASMBinary(bytes);
}

main()