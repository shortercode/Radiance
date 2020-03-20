class ByteReader {
    constructor(bytes) {
        this.offset = 0;
        this.view = new DataView(bytes);
        this.length = this.view.byteLength;
    }
    hasReachedEnd() {
        return this.offset >= this.length;
    }
    skipBytes(count) {
        if (this.offset + count > this.length)
            throw new Error("Out of range");
        this.offset += count;
    }
    readUint8() {
        if (this.offset + 1 > this.length)
            throw new Error("Out of range");
        const value = this.view.getUint8(this.offset);
        this.offset += 1;
        return value;
    }
    readUint32() {
        if (this.offset + 4 > this.length)
            throw new Error("Out of range");
        const value = this.view.getUint32(this.offset);
        this.offset += 4;
        return value;
    }
    readUVint(maximumBytes = 5) {
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
    readBuffer(count) {
        if (this.offset + count > this.length)
            throw new Error("Out of range");
        const value = new Uint8Array(this.view.buffer, this.offset, count);
        this.offset += count;
        return value;
    }
}
function readValueType(byteReader) {
    switch (byteReader.readUint8()) {
        case 0x7F: return "i32";
        case 0x7E: return "i64";
        case 0x7D: return "f32";
        case 0x7C: return "f64";
        default: return null;
    }
}
function readLimit(byteReader) {
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
function disassembleWASMBinary(bytes) {
    const byteReader = new ByteReader(bytes);
    const magicNumber = byteReader.readUint32();
    const versionNumber = byteReader.readUint32();
    assert(magicNumber === 0x0061736D, `Incorrect magic number ${magicNumber}`);
    assert(versionNumber === 0x01000000, `Incorrect version number ${versionNumber}`);
    while (byteReader.hasReachedEnd() === false) {
        const sectionID = byteReader.readUint8();
        const sectionLength = byteReader.readUVint();
        switch (sectionID) {
            case 0: { // custom section type - should ignore
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
                    assert(byteReader.readUint8() === 0x70, `Table type magic number invalid`);
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
                NOT_IMPLEMENTED("global section");
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
function assert(test, message) {
    if (test === false)
        throw new Error(message);
}
function readArguments() {
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
function NOT_IMPLEMENTED(label = "unknown") {
    throw new Error(`Not implemented (${label})`);
}
function tryDisassemblyWASMBinary(bytes) {
    try {
        disassembleWASMBinary(bytes);
    }
    catch (error) {
        console.log(error.message);
    }
}
async function main() {
    const { filename } = readArguments();
    const bytes = (await readFile(filename));
    tryDisassemblyWASMBinary(bytes);
}
main();
