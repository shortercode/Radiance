import { I32_TYPE } from "./AtiumType";
import { Variable } from "./Variable";
import { Compiler, AST } from "./core";
import { initialise_function_environment, complete_function_environment } from "./expressions/function";
import { WASTModuleNode, WASTExportNode, WASTMemoryNode, WASTGlobalNode, WASTGetGlobalNode, WASTGetLocalNode, WASTAddNode, WASTSetLocalNode, WASTSetGlobalNode } from "../WASTNode";
import { default_initialiser } from "./default_initialiser";

const MEMORY_EXPORT_NAME = "memory";
const SHOULD_EXPORT_MEMORY = true;

/*
This class is the second stage of the process after the parser. It performs type validation
on the Atium code and converts it from a Atium AST to a WebAssembly AST. The final stage
serialises this WebAssembly AST into a binary file.
*/

export default function (node: AST): WASTModuleNode {
	const compiler: Compiler = new Compiler;
	const module = create_module(compiler, node);

	for (const stmt of preamble(node, compiler)) {
		module.statements.push(stmt);
	}

	for (const stmt of compiler.visit_global_statement(node)) {
		module.statements.push(stmt);
	}

	for (const stmt of generate_globals(node, compiler)) {
		module.statements.push(stmt);
	}

	for (const stmt of compiler.ctx.data_blocks) {
		module.statements.push(stmt);
	}

	return module;
}

function create_module (compiler: Compiler, node: AST) {
	const static_data_top = compiler.ctx.declare_library_global_variable(
		node,
		"static_data_top",
		I32_TYPE
	);
	return new WASTModuleNode(node, static_data_top);
}

function* preamble (node: AST, compiler: Compiler) {
	yield generate_malloc_function(node, compiler);

	const memory_stmt = new WASTMemoryNode(node, 0, "main", 1);
	yield memory_stmt;

	if (SHOULD_EXPORT_MEMORY) {
		compiler.ctx.define_export(node, MEMORY_EXPORT_NAME);
		const export_memory_stmt = new WASTExportNode(node, "memory", MEMORY_EXPORT_NAME, memory_stmt.id);
		yield export_memory_stmt;
	}
}

function* generate_globals (node: AST, compiler: Compiler) {
	for (const global of compiler.ctx.global_variables) {
		// WARN this isn't the right node reference...
		const ref = node;
		const value_node = default_initialiser(ref, global.type);
		yield new WASTGlobalNode(ref, global.id, global.type, value_node);
	}
}

function generate_malloc_function (node: AST, compiler: Compiler) {
	const ctx = compiler.ctx;
	/*
	NOTE this function is rather intense, this is what it should be creating
		let heap_top: i32 = 0

		func malloc (size: i32): i32 {
			let ptr: i32 = heap_top;
			heap_top = heap_top + size;
			ptr
		}
	*/
	const offset_var = ctx.declare_library_global_variable(node	, "heap_top", I32_TYPE);
	const size_variable = new Variable(node, I32_TYPE, "size", 0);
	const fn_decl = ctx.declare_function(node, "malloc", I32_TYPE, [ size_variable ]);

	const fn_wast = initialise_function_environment(node, ctx, fn_decl);

	const ptr_var = ctx.environment!.declare(node, "ptr", I32_TYPE);
	const get_offset_node = new WASTGetGlobalNode(node, offset_var.id, offset_var.name, offset_var.type);
	const get_size_node = new WASTGetLocalNode(node, size_variable.id, size_variable.name, size_variable.type);
	const calc_new_offset_node = new WASTAddNode(node, I32_TYPE, get_offset_node, get_size_node);
	
	const set_pointer_node = new WASTSetLocalNode(node, ptr_var.id, ptr_var.name, get_offset_node);
	const set_offset_node = new WASTSetGlobalNode(node, offset_var.id, offset_var.name, calc_new_offset_node);
	const get_pointer_node = new WASTGetLocalNode(node, ptr_var.id, ptr_var.name, ptr_var.type);

	fn_wast.body.nodes.push(
		set_pointer_node,
		set_offset_node,
		get_pointer_node
	);

	complete_function_environment(compiler, fn_wast, fn_decl);
	
	return fn_wast;
}