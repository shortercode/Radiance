import { Writer } from "./Writer";
import { Variable } from "../compiler/Variable";
import { AtiumType, I32_TYPE } from "../compiler/AtiumType";
import { Opcode } from "./OpCode";
import { FunctionContext } from "./FunctionContext";
import { write_value_type } from "./write_value_type";
import { write_expression } from "./expressions/expression";
import { WASTModuleNode, WASTStatementNode, WASTMemoryNode, WASTExportNode, WASTFunctionNode, SourceReference, WASTTableNode, WASTNodeList, WASTConstNode, WASTGlobalNode } from "../WASTNode";
import { ModuleContext } from "./ModuleContext";
import { compiler_assert } from "../compiler/error";

export default function serialize_wast(ast: WASTModuleNode): Uint8Array {
	
	const writer = new Writer;
	const module_ctx = new ModuleContext(writer);
	
	write_header(module_ctx);
	
	const {
		function_nodes,
		memory_nodes,
		export_nodes,
		table_nodes,
		global_nodes
	} = seperate_statement_nodes(ast.statements);

	const requires_exports = export_nodes.length > 0;
	const requires_tables = table_nodes.length > 0;
	const requires_memory = memory_nodes.length > 0;
	const requires_function = function_nodes.length > 0;
	const requires_globals = global_nodes.length > 0;
	
	if (requires_function) {
		write_section_1(module_ctx, function_nodes);
		write_section_3(module_ctx, function_nodes);
	}
	if (requires_tables) {
		write_section_4(module_ctx, table_nodes);
	}
	if (requires_memory) {
		write_section_5(module_ctx, memory_nodes);
	}
	if (requires_globals) {
		write_section_6(module_ctx, global_nodes);
	}
	if (requires_exports) {
		write_section_7(module_ctx, export_nodes);
	}
	if (requires_tables) {
		write_section_9(module_ctx, table_nodes);
	}
	if (requires_function) {
		write_section_10(module_ctx, function_nodes);
	}
	
	return writer.complete();
}

function seperate_statement_nodes (statements: Array<WASTStatementNode>) {
	const function_nodes: Array<WASTFunctionNode> = [];
	const memory_nodes: Array<WASTMemoryNode> = [];
	const export_nodes: Array<WASTExportNode> = [];
	const table_nodes: Array<WASTTableNode> = [];
	const global_nodes: Array<WASTGlobalNode> = [];
	
	for (const node of statements) {
		switch (node.type) {
			case "export":
			export_nodes.push(node);
			break;
			case "function":
			function_nodes.push(node);
			break;
			case "table":
			table_nodes.push(node);
			break;
			case "memory":
			memory_nodes.push(node);
			break;
			case "global":
			global_nodes.push(node);
			break;
		}
	}
	
	return {
		function_nodes,
		memory_nodes,
		export_nodes,
		table_nodes,
		global_nodes
	};
}

function write_header (module_ctx: ModuleContext) {
	const MAGIC_NUMBER = 0x0061736D;
	const VERSION_NUMBER = 0x01000000;
	
	module_ctx.writer.writeUint32(MAGIC_NUMBER);
	module_ctx.writer.writeUint32(VERSION_NUMBER);
}

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

function write_section_1 (module_ctx: ModuleContext, function_nodes: Array<WASTFunctionNode>) {
	// Section 1 - Types AKA function signatures
	// NOTE we're taking the lazy approach of having one signature
	// per function at the moment, but we should really be deduplicating
	// the signatures ( which is the only reason why this section is 
	// seperate from section 3 )
	
	const writer = module_ctx.writer;
	const section_offset = write_section_header(writer, 1);
	
	writer.writeUVint(function_nodes.length);
	
	for (const function_node of function_nodes) {
		writer.writeUint8(0x60);
		writer.writeUVint(function_node.parameters.length);
		for (const parameter of function_node.parameters) {
			write_value_type(writer, parameter.type);
		}
		
		if (function_node.result.is_void()) {
			writer.writeUVint(0);
		}
		else {
			writer.writeUVint(1);
			write_value_type(writer, function_node.result);
		}
	}
	
	finish_section_header(writer, section_offset);
}

function write_section_3 (module_ctx: ModuleContext, function_nodes: Array<WASTFunctionNode>) {
	// Section 3 - Function AKA function ID to signature mapping
	const writer = module_ctx.writer;
	const section_offset = write_section_header(writer, 3);
	
	writer.writeUVint(function_nodes.length);
	
	for (let i = 0; i < function_nodes.length; i++) {
		writer.writeUVint(i);
		module_ctx.function_index_map.set(function_nodes[i].id, i);
	}
	
	finish_section_header(writer, section_offset);
}

function write_section_4 (module_ctx: ModuleContext, table_nodes: Array<WASTTableNode>) {
	// Section 4 - Table
	const writer = module_ctx.writer;
	const section_offset = write_section_header(writer, 4);
	
	const count = table_nodes.length;
	compiler_assert(count < 2, SourceReference.unknown(), `Cannot have more than 1 table node`);	
	writer.writeUVint(count);
	
	for (let i = 0; i < count; i++) {
		const node = table_nodes[i];
		const count = node.elements.length;
		writer.writeUint8(0x70); // table element type function ( only type ATM )
		write_bounded_limit(writer, count, count);
	}
	
	finish_section_header(writer, section_offset);
}

function write_section_5 (module_ctx: ModuleContext, memory_nodes: Array<WASTMemoryNode>) {
	// Section 5 - Memory AKA memory block declaration
	const writer = module_ctx.writer;
	const section_offset = write_section_header(writer, 5);
	
	const count = memory_nodes.length;
	compiler_assert(count < 2, SourceReference.unknown(), `Cannot have more than 1 memory node`);	
	writer.writeUVint(count);
	
	for (let i = 0; i < count; i++) {
		const node = memory_nodes[i];
		write_unbounded_limit(writer, node.size);
		module_ctx.memory_index_map.set(node.id, i);
	}
	
	finish_section_header(writer, section_offset);
}

function write_section_6 (module_ctx: ModuleContext, global_nodes: Array<WASTGlobalNode>) {
	// Section 6 - Globals
	const writer = module_ctx.writer;
	const section_offset = write_section_header(writer, 6);
	
	const count = global_nodes.length;
	writer.writeUVint(count);

	const empty_function_context = new FunctionContext(writer, new Map, new Map, []);

	for (let i = 0; i < count; i++) {
		const node = global_nodes[i];
		write_value_type(writer, node.value_type);
		const flag = node.mutable ? 1 : 0;
		writer.writeUint8(flag);
		write_expression(empty_function_context, node.initialiser);
		writer.writeUint8(Opcode.end);
		module_ctx.global_index_map.set(node.id, i);
	}
	
	finish_section_header(writer, section_offset);
}

function write_section_7 (module_ctx: ModuleContext, export_nodes: Array<WASTExportNode>) {
	// Section 7 - Export AKA public function exports
	const writer = module_ctx.writer;
	const section_offset = write_section_header(writer, 7);
	
	writer.writeUVint(export_nodes.length);
	
	for (let i = 0; i < export_nodes.length; i++) {
		const node = export_nodes[i];
		writer.writeString(node.name);
		switch (node.target_type) {
			case "function": {
				writer.writeUint8(0);
				const index = module_ctx.function_index_map.get(node.target);
				if (typeof index !== "number") {
					throw new Error(`Cannot export unknown function ${node.target}`);
				}
				writer.writeUVint(index);
				break;
			}
			case "memory":
			writer.writeUint8(2);
			const index = module_ctx.memory_index_map.get(node.target);
			if (typeof index !== "number") {
				throw new Error(`Cannot export unknown memory ${node.target}`);
			}
			writer.writeUVint(index);
			break;
			default:
			throw new Error("Invalid export type");
		}
	}
	
	finish_section_header(writer, section_offset);
}

function write_section_9 (module_ctx: ModuleContext, table_nodes: Array<WASTTableNode>) {
	// Section 9 - Element AKA table contents
	const writer = module_ctx.writer;
	const section_offset = write_section_header(writer, 9);
	
	const count = table_nodes.length;
	compiler_assert(count < 2, SourceReference.unknown(), `Cannot have more than 1 table node`);	
	writer.writeUVint(count);

	const empty_function_context = new FunctionContext(writer, new Map, new Map, []);
	
	for (let i = 0; i < count; i++) {
		const node = table_nodes[i];
		writer.writeUVint(i);

		/*
		We have to write an expression here to designate the offset of this Table element segment,
		but we are using them very simply with only 1 segment that start at 0. Hence we have to
		construct a small nodelist containing a single constant (0) and serialise it
		*/
		{
			const unknown_reference = SourceReference.unknown();
			const offset_list_expr = new WASTNodeList(unknown_reference);
			const offset_const_expr = new WASTConstNode(unknown_reference, I32_TYPE, "0");

			offset_list_expr.nodes.push(offset_const_expr);
			offset_list_expr.value_type = I32_TYPE;

			write_expression(empty_function_context, offset_list_expr);
			writer.writeUint8(Opcode.end);
		}

		const elements = node.elements;
		writer.writeUVint(elements.length);
		for (const fn of elements) {
			const index = module_ctx.function_index_map.get(fn.id);
			if (typeof index !== "number") {
				throw new Error(`Cannot export unknown function ${fn.name}`);
			}
			writer.writeUVint(index);
		}
	}
	
	finish_section_header(writer, section_offset);
}

function write_section_10 (module_ctx: ModuleContext, function_nodes: Array<WASTFunctionNode>) {
	// Section 10 - Code AKA function bodies
	const writer = module_ctx.writer;
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
		
		const locals = node.locals;
		const fn_map = module_ctx.function_index_map;
		const global_map = module_ctx.global_index_map;
		const ctx = new FunctionContext(writer,	fn_map, global_map, locals);
		
		write_expression(ctx, node.body);
		writer.writeUint8(Opcode.end);
		
		const code_block_length = writer.getCurrentOffset() - code_block_start - 5;
		writer.changeFixedSizeUVint(code_block_start, code_block_length);
	}
	
	finish_section_header(writer, section_offset);
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
		if (last[0].equals(current_local.type)) {
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