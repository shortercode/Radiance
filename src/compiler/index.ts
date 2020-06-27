import { I32_TYPE } from "./LangType";
import { Variable } from "./Variable";
import { Compiler, AST } from "./core";
import { initialise_function_environment, complete_function_environment } from "./expressions/function";
import { WASTModuleNode, WASTExportNode, WASTMemoryNode, WASTGlobalNode, WASTAddNode, Ref, WASTSetVarNode, WASTGetVarNode } from "../WASTNode";
import { zero_initialiser } from "./default_initialiser";

const MEMORY_EXPORT_NAME = "memory";
const SHOULD_EXPORT_MEMORY = true;

/*
This class is the second stage of the process after the parser. It performs type validation
on the language source and converts it from a language AST to a WebAssembly AST. The final stage
serialises this WebAssembly AST into a binary file.
*/

export default function (node: AST): WASTModuleNode {
	const compiler: Compiler = new Compiler;
	const module_ref = Ref.from_node(node);
	const module = create_module(compiler, module_ref);

	for (const stmt of preamble(module_ref, compiler)) {
		module.statements.push(stmt);
	}

	for (const stmt of compiler.visit_global_statement(node)) {
		module.statements.push(stmt);
	}

	for (const stmt of generate_globals(compiler)) {
		module.statements.push(stmt);
	}

	for (const stmt of compiler.ctx.data_blocks) {
		module.statements.push(stmt);
	}

	return module;
}

function create_module (compiler: Compiler, module_ref: Ref) {
	const static_data_top = compiler.ctx.declare_library_global_variable(
		module_ref,
		"static_data_top",
		I32_TYPE
	);
	return new WASTModuleNode(module_ref, static_data_top);
}

function* preamble (ref: Ref, compiler: Compiler) {
	yield generate_malloc_function(ref, compiler);

	const memory_stmt = new WASTMemoryNode(ref, 0, "main", 1);
	yield memory_stmt;

	if (SHOULD_EXPORT_MEMORY) {
		compiler.ctx.define_export(ref, MEMORY_EXPORT_NAME);
		const export_memory_stmt = new WASTExportNode(ref, "memory", MEMORY_EXPORT_NAME, memory_stmt.id);
		yield export_memory_stmt;
	}
}

function* generate_globals (compiler: Compiler) {
	for (const global of compiler.ctx.global_variables) {
		const value_node = zero_initialiser(global.source, global.type);
		yield new WASTGlobalNode(global.source, global.id, global.type, value_node);
	}
}

function generate_malloc_function (ref: Ref, compiler: Compiler) {
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
	const offset_var = ctx.declare_library_global_variable(ref, "heap_top", I32_TYPE);
	const size_variable = new Variable(ref, I32_TYPE, "size", 0, false);
	const fn_decl = ctx.declare_function(ref, "malloc", I32_TYPE, [ size_variable ]);

	const fn_wast = initialise_function_environment(ref, ctx, fn_decl);

	const ptr_var = ctx.get_environment(ref).declare(ref, "ptr", I32_TYPE);
	const get_offset_node = new WASTGetVarNode(offset_var);
	const get_size_node = new WASTGetVarNode(size_variable);
	const calc_new_offset_node = new WASTAddNode(ref, I32_TYPE, get_offset_node, get_size_node);
	
	const set_pointer_node = new WASTSetVarNode(ptr_var, get_offset_node);
	const set_offset_node = new WASTSetVarNode(offset_var, calc_new_offset_node);
	const get_pointer_node = new WASTGetVarNode(ptr_var);

	fn_wast.body.nodes.push(
		set_pointer_node,
		set_offset_node,
		get_pointer_node
	);

	complete_function_environment(compiler, fn_wast, fn_decl);
	
	return fn_wast;
}