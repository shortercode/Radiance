import * as WAST from "../WASTNode";
import { Writer } from "./Writer";
import { Variable } from "../compiler/Variable";
import { AtiumType } from "../compiler/AtiumType";
import { Opcode } from "./OpCode";

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

export default function serialize_wast(ast: WAST.WASTModuleNode): Uint8Array {
    
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
        }
    }

    const function_index_map: Map<string, number> = new Map;
    const memory_index_map: Map<string, number> = new Map;

    // Section 1 - Types AKA function signatures
    {
        // NOTE we're taking the lazy approach of having one signature
        // per function at the moment, but we should really be deduplicating
        // the signatures ( which is the only reason why this section is 
        // seperate from section 3 )

        const section_offset = write_section_header(writer, 1);

        writer.writeUVint(function_nodes.length);

        for (const function_node of function_nodes) {
						writer.writeUint8(0x60);
            writer.writeUVint(function_node.parameters.length);
            for (const parameter of function_node.parameters) {
                write_value_type(writer, parameter.type);
            }
						
						if (function_node.result === "void") {
								writer.writeUVint(0);
						}
						else {
								writer.writeUVint(1);
								write_value_type(writer, function_node.result);
						}
        }

        finish_section_header(writer, section_offset);
    }

    // Section 3 - Function AKA function ID to signature mapping
    {
        const section_offset = write_section_header(writer, 3);

        writer.writeUVint(function_nodes.length);

        for (let i = 0; i < function_nodes.length; i++) {
            writer.writeUVint(i);
            function_index_map.set(function_nodes[i].name, i);
        }

        finish_section_header(writer, section_offset);
    }

    // Section 5 - Memory AKA memory block declaration

    {
        const section_offset = write_section_header(writer, 5);

        // TODO should assert that there is only 1 memory node

        writer.writeUVint(memory_nodes.length);

        for (let i = 0; i < memory_nodes.length; i++) {
            const node = memory_nodes[i];
            write_unbounded_limit(writer, node.size);
            memory_index_map.set(node.name, i);
        }

        finish_section_header(writer, section_offset);
    }

    // Section 7 - Export AKA public function exports

    {
        const section_offset = write_section_header(writer, 7);

        writer.writeUVint(export_nodes.length);

        for (let i = 0; i < export_nodes.length; i++) {
            const node = export_nodes[i];
            writer.writeString(node.name);
            switch (node.target_type) {
                case "function": {
                    writer.writeUint8(0);
                    const index = function_index_map.get(node.target);
                    if (typeof index !== "number")
                        throw new Error(`Cannot export unknown function ${node.target}`);
                    writer.writeUVint(index);
                    break;
                }
                case "memory":
                    writer.writeUint8(2);
                    const index = memory_index_map.get(node.target);
                    if (typeof index !== "number")
                        throw new Error(`Cannot export unknown memory ${node.target}`);
                    writer.writeUVint(index);
                    break;
                default:
                    throw new Error("Invalid export type");
            }
        }

        finish_section_header(writer, section_offset);
    }

    // Section 10 - Code AKA function bodies

    {
        const section_offset = write_section_header(writer, 10);

        writer.writeUVint(function_nodes.length);

        for (let i = 0; i < function_nodes.length; i++) {
						const code_block_start = writer.writeFixedSizeUVint(0);
						const node = function_nodes[i];

						const parameter_count = node.parameters.length;
						
						// NOTE locals are written with a style of run length encoding
						// to save space, so we must first convert the locals array into
						// an array of [type, count] tuples. We could also in theory
						// rearrange so that all locals of the same type are adjacent to
						// reduce to item count 
						const locals_excluding_parameters = node.locals.slice(parameter_count);
						const locals_compressed = compress_local_variables(locals_excluding_parameters);

						writer.writeUVint(locals_compressed.length);

						for (const [type, count] of locals_compressed) {
							writer.writeUVint(count);
							write_value_type(writer, type);
						}

						const ctx = new FunctionContext(
							writer,
							function_index_map,
							node.locals
						);
						
						if (node.body.length > 0) {
								for (let i = 0; i < node.body.length - 1; i++) {
										const subnode = node.body[i];
										write_expression(ctx, subnode);
										if (subnode.value_type !== "void") {
												ctx.consume_any_value();
												write_drop_instruction(writer);
										}
								}
							
								{
										const last_subnode = node.body[node.body.length - 1];
										write_expression(ctx, last_subnode);
								}
						}

						// NOTE if the return type is "void" we may need to throw away
						// the last stack value
						if (node.result === "void" && ctx.stack_depth > 0) {
								write_drop_instruction(writer);
								ctx.consume_any_value();
						}

						const required_stack_depth = node.result === "void" ? 0 : 1;

						if (ctx.stack_depth !== required_stack_depth)
								throw new Error(`Expected ${required_stack_depth} values on the stack but only ${ctx.stack_depth} are present`);

						writer.writeUint8(Opcode.end);
						const code_block_length = writer.getCurrentOffset() - code_block_start - 5;
						writer.changeFixedSizeUVint(code_block_start, code_block_length);
				}
				
				finish_section_header(writer, section_offset);
    }

    return writer.complete();
}

function write_expression(ctx: FunctionContext, node: WAST.WASTExpressionNode) {
		switch (node.type) {
			case "add":
				return write_add_expression(ctx, node);
			case "sub":
				return write_sub_expression(ctx, node);
			case "block":
				return write_block_expression(ctx, node);
			case "call":
				return write_call_expression(ctx, node);
			case "const":
				return write_const_expression(ctx, node);
			case "get_local":
				return write_get_local_expression(ctx, node);
			case "multiply":
				return write_multiply_expression(ctx, node);
			case "set_local":
				return write_set_local_expression(ctx, node);
			case "if":
				return write_conditional_expression(ctx, node);
			case "equals":
				return write_equals_expression(ctx, node);
			case "not_equals":
				return write_not_equals_expression(ctx, node);
			case "less_than":
				return write_less_than_expression(ctx, node);
			case "less_than_equals":
				return write_less_than_equals_expression(ctx, node);
			case "greater_than":
				return write_greater_than_expression(ctx, node);
			case "greater_than_equals":
				return write_greater_than_equals_expression(ctx, node);
			case "store":
			case "load":
				throw new Error("Not implemented");
		}
}

function write_conditional_expression(ctx: FunctionContext, node: WAST.WASTConditionalNode) {
	write_expression(ctx, node.condition)
	ctx.consume_value("boolean");
	ctx.writer.writeUint8(Opcode.if);
	write_value_type(ctx.writer, node.value_type);
	write_expression(ctx, node.then_branch);

	const does_emit_value = node.value_type !== "void";
	if (does_emit_value) {
		ctx.consume_value(node.value_type);
	}
	if (node.else_branch !== null) {
		ctx.writer.writeUint8(Opcode.else);
		write_expression(ctx, node.else_branch);
		if (does_emit_value) {
			ctx.consume_value(node.value_type);
		}
	}
	ctx.writer.writeUint8(Opcode.end);
	if (does_emit_value) {
		ctx.push_value(node.value_type);
	}
}

function write_equals_expression(ctx: FunctionContext, node: WAST.WASTEqualsNode) {
	write_expression(ctx, node.left);
	write_expression(ctx, node.right);

	ctx.consume_value(node.value_type);
	ctx.consume_value(node.value_type);
	ctx.push_value("boolean");

	switch (node.value_type) {
		case "f32":
			ctx.writer.writeUint8(Opcode.f32_eq);
			break;
		case "f64":
			ctx.writer.writeUint8(Opcode.f64_eq);
			break;
		case "boolean":
		case "i32":
			ctx.writer.writeUint8(Opcode.i32_eq);
			break;
		case "i64":
			ctx.writer.writeUint8(Opcode.i64_eq);
			break;
	}
}

function write_not_equals_expression(ctx: FunctionContext, node: WAST.WASTNotEqualsNode) {
	write_expression(ctx, node.left);
	write_expression(ctx, node.right);

	ctx.consume_value(node.value_type);
	ctx.consume_value(node.value_type);
	ctx.push_value("boolean");

	switch (node.value_type) {
		case "f32":
			ctx.writer.writeUint8(Opcode.f32_ne);
			break;
		case "f64":
			ctx.writer.writeUint8(Opcode.f64_ne);
			break;
		case "boolean":
		case "i32":
			ctx.writer.writeUint8(Opcode.i32_ne);
			break;
		case "i64":
			ctx.writer.writeUint8(Opcode.i64_ne);
			break;
	}
}

function write_less_than_expression(ctx: FunctionContext, node: WAST.WASTLessThanNode) {
	write_expression(ctx, node.left);
	write_expression(ctx, node.right);

	ctx.consume_value(node.value_type);
	ctx.consume_value(node.value_type);
	ctx.push_value("boolean");

	switch (node.value_type) {
		case "f32":
			ctx.writer.writeUint8(Opcode.f32_lt);
			break;
		case "f64":
			ctx.writer.writeUint8(Opcode.f64_lt);
			break;
		case "boolean":
		case "i32":
			ctx.writer.writeUint8(Opcode.i32_lt_s);
			break;
		case "i64":
			ctx.writer.writeUint8(Opcode.i64_lt_s);
			break;
	}
}

function write_greater_than_expression(ctx: FunctionContext, node: WAST.WASTGreaterThanNode) {
	write_expression(ctx, node.left);
	write_expression(ctx, node.right);

	ctx.consume_value(node.value_type);
	ctx.consume_value(node.value_type);
	ctx.push_value("boolean");

	switch (node.value_type) {
		case "f32":
			ctx.writer.writeUint8(Opcode.f32_gt);
			break;
		case "f64":
			ctx.writer.writeUint8(Opcode.f64_gt);
			break;
		case "boolean":
		case "i32":
			ctx.writer.writeUint8(Opcode.i32_gt_s);
			break;
		case "i64":
			ctx.writer.writeUint8(Opcode.i64_gt_s);
			break;
	}
}

function write_less_than_equals_expression(ctx: FunctionContext, node: WAST.WASTLessThanEqualsNode) {
	write_expression(ctx, node.left);
	write_expression(ctx, node.right);

	ctx.consume_value(node.value_type);
	ctx.consume_value(node.value_type);
	ctx.push_value("boolean");

	switch (node.value_type) {
		case "f32":
			ctx.writer.writeUint8(Opcode.f32_le);
			break;
		case "f64":
			ctx.writer.writeUint8(Opcode.f64_le);
			break;
		case "boolean":
		case "i32":
			ctx.writer.writeUint8(Opcode.i32_le_s);
			break;
		case "i64":
			ctx.writer.writeUint8(Opcode.i64_le_s);
			break;
	}
}

function write_greater_than_equals_expression(ctx: FunctionContext, node: WAST.WASTGreaterThanEqualsNode) {
	write_expression(ctx, node.left);
	write_expression(ctx, node.right);

	ctx.consume_value(node.value_type);
	ctx.consume_value(node.value_type);
	ctx.push_value("boolean");

	switch (node.value_type) {
		case "f32":
			ctx.writer.writeUint8(Opcode.f32_ge);
			break;
		case "f64":
			ctx.writer.writeUint8(Opcode.f64_ge);
			break;
		case "boolean":
		case "i32":
			ctx.writer.writeUint8(Opcode.i32_ge_s);
			break;
		case "i64":
			ctx.writer.writeUint8(Opcode.i64_ge_s);
			break;
	}
}

function write_add_expression(ctx: FunctionContext, node: WAST.WASTAddNode) {
	write_expression(ctx, node.left);
	write_expression(ctx, node.right);

	ctx.consume_value(node.value_type);
	ctx.consume_value(node.value_type);
	ctx.push_value(node.value_type);

	switch (node.value_type) {
		case "f32":
			ctx.writer.writeUint8(Opcode.f32_add);
			break;
		case "f64":
			ctx.writer.writeUint8(Opcode.f64_add);
			break;
		case "i32":
			ctx.writer.writeUint8(Opcode.i32_add);
			break;
		case "i64":
			ctx.writer.writeUint8(Opcode.i64_add);
			break;
	}
}

function write_sub_expression(ctx: FunctionContext, node: WAST.WASTSubNode) {
	write_expression(ctx, node.left);
	write_expression(ctx, node.right);

	ctx.consume_value(node.value_type);
	ctx.consume_value(node.value_type);
	ctx.push_value(node.value_type);

	switch (node.value_type) {
		case "f32":
			ctx.writer.writeUint8(Opcode.f32_sub);
			break;
		case "f64":
			ctx.writer.writeUint8(Opcode.f64_sub);
			break;
		case "i32":
			ctx.writer.writeUint8(Opcode.i32_sub);
			break;
		case "i64":
			ctx.writer.writeUint8(Opcode.i64_sub);
			break;
	}
}

function write_block_expression(ctx: FunctionContext, block_node: WAST.WASTBlockNode) {

	const block_statements = block_node.body;

	if (block_statements.length === 0)
		return;

	ctx.writer.writeUint8(Opcode.block);
	write_value_type(ctx.writer, block_node.value_type);

	for (let i = 0; i < block_statements.length - 1; i++) {
		const subnode = block_statements[i];
		write_expression(ctx, subnode);
		if (subnode.value_type !== "void") {
			ctx.consume_any_value();
			write_drop_instruction(ctx.writer);
		}
	}

	{
		const last_subnode = block_statements[block_statements.length - 1];
		write_expression(ctx, last_subnode);
		const has_value = last_subnode.value_type !== "void";
		const does_not_emit_value = block_node.value_type === "void"
		if (has_value && does_not_emit_value) {
			ctx.consume_value(last_subnode.value_type);
			write_drop_instruction(ctx.writer);
		}
	}

	if (block_node.value_type === "void") {
			if (ctx.stack_depth !== 0)
					throw new Error(`Expected no values on the stack, but found ${ctx.stack_depth}`);
	}
	else if (ctx.stack_depth !== 1) {
			throw new Error(`Expected 1 values on the stack, but found ${ctx.stack_depth}`);
	}

	ctx.writer.writeUint8(Opcode.end);
}

function write_call_expression(ctx: FunctionContext, node: WAST.WASTCallNode) {
	const function_id = ctx.function_lookup.get(node.name);

	if (typeof function_id !== "number")
		throw new Error(`Cannot find function ${node.name}`);

	for (const arg of node.arguments) {
		write_expression(ctx, arg);
		ctx.consume_value(arg.value_type);
	}

	if (node.value_type !== "void") {
			ctx.push_value(node.value_type);
	}

	ctx.writer.writeUint8(Opcode.call);
	ctx.writer.writeUVint(function_id);
}

function write_const_expression(ctx: FunctionContext, node: WAST.WASTConstNode) {

	ctx.push_value(node.value_type);

	switch (node.value_type) {
		case "f32":
			ctx.writer.writeUint8(Opcode.f32_const);
			ctx.writer.writeFloat32(parseFloat(node.value));
			break;
		case "f64":
			ctx.writer.writeUint8(Opcode.f64_const);
			ctx.writer.writeFloat64(parseFloat(node.value));
			break;
		case "i32":
			ctx.writer.writeUint8(Opcode.i32_const);
			ctx.writer.writeUVint(parseInt(node.value, 10));
			break;
		case "i64":
			ctx.writer.writeUint8(Opcode.i64_const);
			// WARN node.value may not fit into a JS number literal!
			// which would cause this to input the wrong number
			ctx.writer.writeUVint(parseInt(node.value, 10));
			break;
	}
}

function write_get_local_expression(ctx: FunctionContext, node: WAST.WASTGetLocalNode) {
	const local_id = ctx.variable_lookup.get(node.id);

	if (typeof local_id !== "number")
		throw new Error(`Cannot find local ${node.name}`);

	ctx.push_value(node.value_type);
	
	ctx.writer.writeUint8(Opcode.local_get);
	ctx.writer.writeUVint(local_id);
}

function write_multiply_expression(ctx: FunctionContext, node: WAST.WASTMultiplyNode) {
	write_expression(ctx, node.left);
	write_expression(ctx, node.right);

	ctx.consume_value(node.value_type);
	ctx.consume_value(node.value_type);
	ctx.push_value(node.value_type);

	switch (node.value_type) {
		case "f32":
			ctx.writer.writeUint8(Opcode.f32_mul);
			break;
		case "f64":
			ctx.writer.writeUint8(Opcode.f64_mul);
			break;
		case "i32":
			ctx.writer.writeUint8(Opcode.i32_mul);
			break;
		case "i64":
			ctx.writer.writeUint8(Opcode.i64_mul);
			break;
	}
}

function write_set_local_expression(ctx: FunctionContext, node: WAST.WASTSetLocalNode) {
	const local_id = ctx.variable_lookup.get(node.id);

	if (typeof local_id !== "number")
		throw new Error(`Cannot find local ${node.name}`);
	
	const subnode = node.value;
	write_expression(ctx, subnode);

	ctx.consume_value(subnode.value_type);

	ctx.writer.writeUint8(Opcode.local_set);
	ctx.writer.writeUVint(local_id);
}

function write_drop_instruction (writer: Writer) {
	writer.writeUint8(Opcode.drop);
}

class FunctionContext {
		readonly writer: Writer
		readonly variable_lookup: Map<number, number> = new Map
		readonly function_lookup: Map<string, number>
		private value_stack: Array<AtiumType> = []

		constructor (writer: Writer, function_lookup: Map<string, number>, locals: Array<Variable>) {
				this.writer = writer;
				this.function_lookup = function_lookup;
				let index = 0;
				for (const local of locals) {
					this.variable_lookup.set(local.id, index++);
				}
		}

		consume_value (type: AtiumType) {
				const value = this.value_stack.pop();
				if (!value)
						throw new Error("Unable to consume value; nothing on the stack");
				if (type !== null && value !== type)
						throw new Error(`Unable to consume value; expected ${type} but is ${value}`);
		}

		consume_any_value() {
				const value = this.value_stack.pop();
				if (!value)
						throw new Error("Unable to consume value; nothing on the stack");
		}

		push_value (type: AtiumType) {
				this.value_stack.push(type);
		}

		get stack_depth () {
				return this.value_stack.length;
		}
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
	const length = writer.getCurrentOffset() - offset - 5;
  writer.changeFixedSizeUVint(offset, length);
}

function write_value_type (writer: Writer, type: AtiumType) {
    switch (type) {
				case "boolean":
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
				case "void":
						writer.writeUint8(0x40);
						break;
				default:
						throw new Error("Invalid value type");
    }
}

function compress_local_variables (locals: Array<Variable>) {
	const output: Array<[AtiumType, number]> = [];
	
	if (locals.length === 0)
		return output;

	let last: [AtiumType, number] = [
		locals[0].type,
		0
	];
	output.push(last);
	
	for (const current_local of locals) {
		if (last[0] === current_local.type) {
			last[1] += 1;
		}
		else {
			last = [
				current_local.type,
				1
			];
			output.push(last);
		}
	}

	return output;
}

function write_unbounded_limit (writer: Writer, min: number) {
    writer.writeUint8(0);
    writer.writeUVint(min);
}

// NOTE not used at this time
function write_bounded_limit(writer: Writer, min: number, max: number) {
    writer.writeUint8(1);
    writer.writeUVint(min);
    writer.writeUVint(max);
}