import { Writer } from "./Writer";
import { Variable } from "../compiler/Variable";
import { LangType, VOID_TYPE } from "../compiler/LangType";
import { Opcode } from "./OpCode";
import { FunctionContext } from "./FunctionContext";
import { write_value_type } from "./write_value_type";
import { write_expression } from "./expressions/expression";
import { WASTModuleNode, WASTStatementNode, WASTMemoryNode, WASTExportNode, WASTFunctionNode, Ref, WASTTableNode, WASTGlobalNode, WASTImportFunctionNode, WASTDataNode, WASTConstNode, WASTGlobalExpression } from "../WASTNode";
import { ModuleContext } from "./ModuleContext";
import { compiler_assert, is_defined } from "../compiler/error";

const IMPORTS_LABEL = "imports";

export default function serialize_wast(ast: WASTModuleNode): Uint8Array {
	
	const writer = new Writer;
	const module_ctx = new ModuleContext(writer);
	
	write_header(module_ctx);
	
	const {
		function_nodes,
		memory_nodes,
		export_nodes,
		table_nodes,
		global_nodes,
		import_nodes,
		data_nodes,
		expression_nodes
	} = seperate_statement_nodes(ast.statements);

	const requires_exports = export_nodes.length > 0;
	const requires_imports = import_nodes.length > 0;
	const requires_tables = table_nodes.length > 0;
	const requires_memory = memory_nodes.length > 0;
	const requires_function = function_nodes.length > 0;
	const requires_globals = global_nodes.length > 0;
	const requires_data = data_nodes.length > 0;
	const requires_initialiser = expression_nodes.length > 0;

	const requires_types = requires_function || requires_imports;
	
	const import_offset = generate_import_types(module_ctx, import_nodes);

	let initialiser_function: WASTFunctionNode;

	if (requires_initialiser) {
		const ref = ast.source;
		initialiser_function = generate_initialiser_function(ref, expression_nodes);
		function_nodes.push(initialiser_function);
	}

	generate_function_types(module_ctx, import_offset, function_nodes);
	generate_static_memory(module_ctx, ast, data_nodes, global_nodes);

	if (requires_types) {
		write_section_1(module_ctx);
	}
	if (requires_imports) {
		write_section_2(module_ctx, import_nodes);
	}
	if (requires_function) {
		write_section_3(module_ctx, import_offset, function_nodes);
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
	if (requires_initialiser) {
		write_section_8(module_ctx, initialiser_function!);
	}
	if (requires_tables) {
		write_section_9(module_ctx, table_nodes);
	}
	if (requires_function) {
		write_section_10(module_ctx, function_nodes);
	}
	if (requires_data) {
		write_section_11(module_ctx, data_nodes);
	}
	
	return writer.complete();
}

function generate_initialiser_function (ref: Ref, nodes: Array<WASTGlobalExpression>) {
	const fn = new WASTFunctionNode(ref, Symbol("main"), "main", VOID_TYPE)
	for (const { expression } of nodes) {
		fn.body.nodes.push(expression);
	}
	return fn;
}

function generate_function_types (ctx: ModuleContext, import_offset: number, statements: Array<WASTFunctionNode>) {
	let i = import_offset;
	for (const fn of statements) {
		const parameters = fn.parameters.map(vari => vari.type);
		const label = type_label(fn.result, parameters);
		if (!ctx.type_index_map.has(label)) {
			ctx.type_index_map.set(label, {
				result: fn.result,
				parameters: parameters,
				index: i
			});
			i += 1;
		}
	}
}

function generate_static_memory (module_ctx: ModuleContext, ast: WASTModuleNode, data_nodes: Array<WASTDataNode>, global_nodes: Array<WASTGlobalNode>) {
	/*
		We delay calculating the offsets of static data blocks until serialisation to
		allow for possible optimisations such as removing unneeded block. This means
		that we have to modify the initial value of the variable that indicates the
		end of the static data block now. This is a little tricky unforunately,
		the option we have gone for is to place the variable into the module_node
		then search all the nodes of the module for the global_declaration node.
		Then we can modify the initialiser of the global_declaration with our freshly
		calculated offset.
	*/
	const memory_offset = calculate_data_node_offsets(module_ctx, data_nodes);
	const top_variable = ast.static_data_top;

	let global_declaration: WASTGlobalNode|null = null;

	for (const node of global_nodes) {
		if (node.id === top_variable.id) {
			global_declaration = node;
		}
	}
	
	compiler_assert(is_defined(global_declaration), ast.source, `Unable to locate the "static_data_top" initialiser`);
	compiler_assert(global_declaration!.initialiser instanceof WASTConstNode, ast.source, `"static_data_top" initialiser isn't a const`);

	const value_node = global_declaration!.initialiser as WASTConstNode;
	value_node.value = memory_offset.toString();
}

function generate_import_types (ctx: ModuleContext, statements: Array<WASTImportFunctionNode>) {
	let i = 0;
	for (const imp of statements) {
		const label = type_label(imp.result, imp.parameters);
		if (!ctx.type_index_map.has(label)) {
			ctx.type_index_map.set(label, {
				result: imp.result,
				parameters: imp.parameters,
				index: i
			});
			i += 1;
		}
	}
	return i;
}

function type_label (result: LangType, parameters: Array<LangType>) {
	return parameters.map(param => param.name).join(",") + "->" + result.name;
}

function seperate_statement_nodes (statements: Array<WASTStatementNode>) {
	const function_nodes: Array<WASTFunctionNode> = [];
	const memory_nodes: Array<WASTMemoryNode> = [];
	const export_nodes: Array<WASTExportNode> = [];
	const table_nodes: Array<WASTTableNode> = [];
	const global_nodes: Array<WASTGlobalNode> = [];
	const import_nodes: Array<WASTImportFunctionNode> = [];
	const data_nodes: Array<WASTDataNode> = [];
	const expression_nodes: Array<WASTGlobalExpression> = [];
	
	for (const node of statements) {
		switch (node.type) {
			case "export":
			export_nodes.push(node);
			break;
			case "import_function":
			import_nodes.push(node);
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
			case "data":
			data_nodes.push(node);
			break;
			case "global_expression":
			expression_nodes.push(node);
			break;
		}
	}
	
	return {
		function_nodes,
		memory_nodes,
		export_nodes,
		table_nodes,
		global_nodes,
		import_nodes,
		data_nodes,
		expression_nodes
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

function write_section_1 (module_ctx: ModuleContext) {
	// Section 1 - Types AKA function signatures	
	const writer = module_ctx.writer;
	const section_offset = write_section_header(writer, 1);

	const types = Array.from(module_ctx.type_index_map.values());
	
	writer.writeUVint(types.length);
	
	for (const function_node of types) {
		writer.writeUint8(0x60);
		writer.writeUVint(function_node.parameters.length);
		for (const parameter of function_node.parameters) {
			write_value_type(writer, parameter);
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

function write_section_2 (module_ctx: ModuleContext, import_nodes: Array<WASTImportFunctionNode>) {
	// Section 2 - Imports
	const writer = module_ctx.writer;
	const section_offset = write_section_header(writer, 2);
	
	writer.writeUVint(import_nodes.length);
	
	for (let i = 0; i < import_nodes.length; i++) {
		const node = import_nodes[i];

		writer.writeString(IMPORTS_LABEL);
		writer.writeString(node.name);

		writer.writeUVint(0x00);
		const label = type_label(node.result, node.parameters);
		const index = module_ctx.type_index_map.get(label)!.index;
		writer.writeUVint(index);
		module_ctx.function_index_map.set(node.id, i);
	}
	
	finish_section_header(writer, section_offset);
}

function write_section_3 (module_ctx: ModuleContext, import_offset: number, function_nodes: Array<WASTFunctionNode>) {
	// Section 3 - Function AKA function ID to signature mapping
	const writer = module_ctx.writer;
	const section_offset = write_section_header(writer, 3);
	
	writer.writeUVint(function_nodes.length);
	
	for (let i = 0; i < function_nodes.length; i++) {
		const node = function_nodes[i];
		const parameters = node.parameters.map(par => par.type);
		const label = type_label(node.result, parameters);
		const index = module_ctx.type_index_map.get(label)!.index;
		writer.writeUVint(index);
		module_ctx.function_index_map.set(node.id, i + import_offset);
	}
	
	finish_section_header(writer, section_offset);
}

function write_section_4 (module_ctx: ModuleContext, table_nodes: Array<WASTTableNode>) {
	// Section 4 - Table
	const writer = module_ctx.writer;
	const section_offset = write_section_header(writer, 4);
	
	const count = table_nodes.length;
	compiler_assert(count < 2, Ref.unknown(), `Cannot have more than 1 table node`);	
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
	compiler_assert(count < 2, Ref.unknown(), `Cannot have more than 1 memory node`);	
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

	const empty_function_context = new FunctionContext(writer, module_ctx, []);

	for (let i = 0; i < count; i++) {
		const node = global_nodes[i];
		write_value_type(writer, node.value_type);
		const flag = node.mutable ? 1 : 0;
		writer.writeUint8(flag);
		// TODO change to use write_offset_expression
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
				writer.writeUint8(0x00);
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

function write_section_8 (module_ctx: ModuleContext, initialiser_function: WASTFunctionNode) {
	// Section 8 - Start
	const writer = module_ctx.writer;
	const section_offset = write_section_header(writer, 8);

	const function_id = module_ctx.function_index_map.get(initialiser_function.id)!;

	writer.writeUVint(function_id);

	finish_section_header(writer, section_offset);
}

function write_section_9 (module_ctx: ModuleContext, table_nodes: Array<WASTTableNode>) {
	// Section 9 - Element AKA table contents
	const writer = module_ctx.writer;
	const section_offset = write_section_header(writer, 9);
	
	const count = table_nodes.length;
	compiler_assert(count < 2, Ref.unknown(), `Cannot have more than 1 table node`);	
	writer.writeUVint(count);

	const empty_function_context = new FunctionContext(writer, module_ctx, []);
	
	for (let i = 0; i < count; i++) {
		const node = table_nodes[i];
		writer.writeUVint(i);

		// TODO change to use write_offset_expression
		write_expression(empty_function_context, node.offset_expr);
		writer.writeUint8(Opcode.end);

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
		const ctx = new FunctionContext(writer,	module_ctx, locals);
		
		write_expression(ctx, node.body);
		writer.writeUint8(Opcode.end);
		
		const code_block_length = writer.getCurrentOffset() - code_block_start - 5;
		writer.changeFixedSizeUVint(code_block_start, code_block_length);
	}
	
	finish_section_header(writer, section_offset);
}

function calculate_data_node_offsets (module_ctx: ModuleContext, data_nodes: Array<WASTDataNode>) {
	let offset = 0;

	for (let i = 0; i < data_nodes.length; i++) {
		const node = data_nodes[i];
		module_ctx.data_index_map.set(node, offset);
		offset += node.bytes.byteLength;
	}

	return offset;
}

function write_section_11 (module_ctx: ModuleContext, data_nodes: Array<WASTDataNode>) {
	// Section 11 - Data
	const writer = module_ctx.writer;
	const section_offset = write_section_header(writer, 11);
	
	const count = data_nodes.length;
	writer.writeUVint(count);
	
	let offset = 0;
	for (let i = 0; i < count; i++) {
		const node = data_nodes[i];
		const memory_id = 0; // only 1 memory allowed ATM
		const length = node.bytes.length;
		writer.writeUVint(memory_id);
		write_offset_expression(writer, offset);
		offset += length;
		writer.writeUVint(length);
		writer.writeBuffer(node.bytes);
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
	const output: Array<[LangType, number]> = [];
	
	if (locals.length === 0)
	return output;
	
	let last: [LangType, number] = [
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

function write_offset_expression (writer: Writer, offset: number) {
	writer.writeUint8(0x41);
	writer.writeUVint(offset);
	writer.writeUint8(0x0B);
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