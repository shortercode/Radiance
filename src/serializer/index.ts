import * as WAST from "../WASTNode";
import { Writer } from "./Writer";

/*
    Section order
    0   custom
    1   type
    2   import
    3   function
    4   table
    5   memory
    6   global
    7   export
    8   start
    9   element
    10  code
    11  data
*/

const MAGIC_NUMBER = 0x0061736D;
const VERSION_NUMBER = 0x01000000;

export function serialize_wast(ast: WAST.WASTModuleNode): Uint8Array {
    
    const writer = new Writer;

    writer.writeUint32(MAGIC_NUMBER);
    writer.writeUint32(VERSION_NUMBER);

    const function_nodes: Array<WAST.WASTFunctionNode> = [];
    const memory_nodes: Array<WAST.WASTMemoryNode> = [];
    const export_nodes: Array<WAST.WASTExportNode> = [];

    for (const node of ast.statements) {
        switch (node.type) {
            case "export":
                export_nodes.push(node);
                break;
            case "function":
                function_nodes.push(node);
                break;
            case "memory":
                memory_nodes.push(node);
                break;
            default:
                throw new Error(`Unexpected statement type ${node.type}`);
        }
    }

    // Section 1 - Types AKA function signatures
    {
        // NOTE we're taking the lazy approach of having one signature
        // per function at the moment, but we should really be deduplicating
        // the signatures ( which is the only reason why this section is 
        // seperate from section 3 )

        const section_offset = write_section_header(writer, 1);

        writer.writeUVint(function_nodes.length);

        for (const function_node of function_nodes) {
            writer.writeUVint(function_node.parameters.length);
            for (const parameter of function_node.parameters) {
                write_value_type(writer, parameter);
            }
            writer.writeUVint(1);
            write_value_type(writer, function_node.result);
        }

        finish_section_header(writer, section_offset);
    }

    // Section 3 - Function AKA function ID to signature mapping

    // Section 5 - Memory AKA memory block declaration

    // Section 7 - Export AKA public function exports

    // Section 10 - Code AKA function bodies

    return writer.complete();
}

function write_section_header (writer: Writer, id: number) {
    /*
        NOTE we write the section header at the start, but
        it includes the size of the header as a UVint
        as such we will have to use the maximum number of bytes for
        the UVint then update the value at the end
    */

    writer.writeUint8(id);
    return writer.writeFixedSizeUVint(0);
}

function finish_section_header (writer: Writer, offset: number) {
    writer.changeFixedSizeUVint(offset, writer.getCurrentOffset() - offset);
}

function write_value_type (writer: Writer, type: WAST.WASTType) {
    switch (type) {
        case "i32":
            writer.writeUint8(0x7F);
            break;
        case "i64":
            writer.writeUint8(0x7E);
            break;
        case "f32":
            writer.writeUint8(0x7D);
            break;
        case "f64":
            writer.writeUint8(0x7C);
            break;
    }
}