import { Compiler, AST } from "../core";
import { WASTStatementNode, WASTExpressionNode, WASTCallNode, WASTExportNode, WASTFunctionNode, WASTConditionalNode, WASTEqualsNode, WASTConstNode, WASTNodeList, WASTAddNode, WASTSubNode, Ref, WASTSetVarNode, WASTGetVarNode } from "../../WASTNode";
import { initialise_function_environment, complete_function_environment, visit_function } from "./function";
import { syntax_assert, is_defined, compiler_assert } from "../error";
import { I32_TYPE, VOID_TYPE } from "../LangType";
import { Context } from "../Context";
import { Variable } from "../Variable";

export function visit_export (compiler: Compiler, node: AST): Array<WASTStatementNode> {
	const data = node.data as {
		name: string
	};
	const ref = Ref.from_node(node);
	
	const wrapper_fn_node = wrap_exported_function(compiler, ref, data.name);
	const export_wast = export_function(compiler, ref, wrapper_fn_node);
	
	return [export_wast, wrapper_fn_node];
}

export function visit_export_function (compiler: Compiler, node: AST): Array<WASTStatementNode> {
	const ref = Ref.from_node(node);
	const fn_wast = compile_function(compiler, node, ref);
	const wrapper_fn_node = wrap_exported_function(compiler, ref, fn_wast.name);
	const export_wast = export_function(compiler, ref, wrapper_fn_node);

	return [fn_wast, export_wast, wrapper_fn_node];
}

function compile_function (compiler: Compiler, node: AST, ref: Ref): WASTFunctionNode {
	const stmt_list = visit_function(compiler, node);

	compiler_assert(stmt_list.length === 1, ref, `Expected visit_function to return exactly 1 stmt`);
	
	const fn_stmt = stmt_list[0] as WASTFunctionNode;

	compiler_assert(fn_stmt instanceof WASTFunctionNode, ref, `Expected visit_function to return a WASTFuncitonNode`);

	return fn_stmt
}

function export_function(compiler: Compiler, ref: Ref, fn: WASTFunctionNode) {
	const ctx = compiler.ctx;
	
	syntax_assert(typeof fn !== "undefined", ref, `Cannot export undeclared function ${fn.name}`);
	
	for (const { name, type } of fn.parameters) {
		syntax_assert(type.is_exportable(), ref, `Cannot export function ${fn.name} because the parameter ${name} is not an exportable type`);
	}

	syntax_assert(fn.result.is_exportable(), ref, `Cannot export function ${fn.name} because the return value is not an exportable type`);

	ctx.define_export(ref, fn.name);

	return new WASTExportNode(ref, "function", fn.name, fn.id);
}

// NOTE this is intended to allow functions called by the host environment to
// include a prefix/postfix template. At the moment we use a bump allocator
// that resets the memory state BEFORE each call into the module, hence the
// need to add additional code around exported functions

function wrap_exported_function(compiler: Compiler, ref: Ref, name: string) {
	const ctx = compiler.ctx;
	const fn = ctx.get_function(name)!;
	
	syntax_assert(is_defined(fn), ref, `Cannot export undeclared function ${name}`);

	const wrapper_fn_decl = ctx.declare_hidden_function(name, fn.type, fn.parameters);
	const fn_wast = initialise_function_environment(ref, ctx, wrapper_fn_decl);

	const args: Array<WASTExpressionNode> = [];

	for (const param of wrapper_fn_decl.parameters) {
		args.push(new WASTGetVarNode(param, ref));
	}

	const call_node = new WASTCallNode(ref, fn.id, name, fn.type, args);
	const [ prefix, suffix ] = get_prefix_and_suffix(compiler, ref);
		
	const returns_value = call_node.value_type.is_void() === false;

	if (returns_value) {
		const temp_variable = ctx.get_environment(ref).declare_hidden(ref, "ret_value", call_node.value_type);
		const store_ret_value_node = new WASTSetVarNode(temp_variable, call_node, ref);
		const get_ret_value_node = new WASTGetVarNode(temp_variable, ref);
		fn_wast.body.nodes.push(
			prefix,
			store_ret_value_node,
			suffix,
			get_ret_value_node
		);
	}
	else {
		fn_wast.body.nodes.push(
			prefix,
			call_node,
			suffix
		);
	}

	complete_function_environment(compiler, fn_wast, wrapper_fn_decl);
	
	return fn_wast;
}

function get_prefix_and_suffix (compiler: Compiler, ref: Ref) {

	/*
	let stack_depth: i32 = 0;
	let static_data_top: i32 = UNKNOWN

	export fn NAME (...params) {
		if stack_depth == 0 {
			heap_top = static_data_top
		}
		stack_depth = stack_depth + 1;
		NAME(...params)
		stack_depth = stack_depth - 1;
	}
	*/

	const ctx = compiler.ctx;

	const stack_depth = get_stack_depth(compiler.ctx, ref);
	const static_data_top = ctx.lib_globals.get("static_data_top") as Variable;
	const heap_top = ctx.lib_globals.get("heap_top") as Variable;

	compiler_assert(is_defined(static_data_top) && is_defined(heap_top), ref, `"static_data_top" and/or "heap_top" are missing`);

	const clear_memory_block = new WASTNodeList(ref);

	clear_memory_block.nodes.push(
		new WASTSetVarNode(
			heap_top,
			new WASTGetVarNode(static_data_top, ref),
			ref
		)
	)
	
	const prefix_block = new WASTNodeList(ref);

	prefix_block.nodes.push(new WASTConditionalNode(
		ref,
		VOID_TYPE,
		new WASTEqualsNode(
			ref,
			new WASTGetVarNode(stack_depth, ref),
			new WASTConstNode(ref, I32_TYPE, "0")
		),
		clear_memory_block,
		new WASTNodeList(ref)
	));
	
	prefix_block.nodes.push(new WASTSetVarNode(
		stack_depth,
		new WASTAddNode(
			ref,
			I32_TYPE,
			new WASTGetVarNode(stack_depth, ref),
			new WASTConstNode(ref, I32_TYPE, "1")
		),
		ref
	));

	const suffix_block = new WASTSetVarNode(
		stack_depth,
		new WASTSubNode(
			ref,
			I32_TYPE,
			new WASTGetVarNode(stack_depth, ref),
			new WASTConstNode(ref, I32_TYPE, "1")
		),
		ref
	)

	return [prefix_block, suffix_block];
}

function get_stack_depth (ctx: Context, ref: Ref): Variable {
	const stack_depth = ctx.lib_globals.get("stack_depth") as Variable;
	if (stack_depth) {
		return stack_depth;
	}
	else {
		return ctx.declare_library_global_variable(ref, "stack_depth", I32_TYPE);
	}
}