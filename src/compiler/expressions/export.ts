import { Compiler, AST } from "../core";
import { WASTStatementNode, WASTGetLocalNode, WASTExpressionNode, WASTCallNode, WASTExportNode, WASTFunctionNode } from "../../WASTNode";
import { initialise_function_environment, complete_function_environment, visit_function } from "./function";
import { syntax_assert, is_defined, syntax_error, compiler_assert } from "../error";
import { FunctionDeclaration } from "../FunctionDeclaration";

export function visit_export (compiler: Compiler, node: AST): Array<WASTStatementNode> {
	const data = node.data as {
		name: string
	};
	
	const export_wast = export_function(compiler, node, data.name);
	const wrapper_fn_node = wrap_exported_function(compiler, node, data.name);
	
	return [export_wast, wrapper_fn_node];
}

export function visit_export_function (compiler: Compiler, node: AST): Array<WASTStatementNode> {
	const fn_wast = compile_function(compiler, node);
	const export_wast = export_function(compiler, node, fn_wast.name);
	const wrapper_fn_node = wrap_exported_function(compiler, node, fn_wast.name);

	return [fn_wast, export_wast, wrapper_fn_node];
}

function compile_function (compiler: Compiler, node: AST): WASTFunctionNode {
	const stmt_list = visit_function(compiler, node);

	compiler_assert(stmt_list.length === 1, node, `Expected visit_function to return exactly 1 stmt`);
	
	const fn_stmt = stmt_list[0] as WASTFunctionNode;

	compiler_assert(fn_stmt instanceof WASTFunctionNode, node, `Expected visit_function to return a WASTFuncitonNode`);

	return fn_stmt
}


function export_function(compiler: Compiler, node: AST, fn_name: string) {
	const ctx = compiler.ctx;

	const fn = ctx.user_globals.get(fn_name);
	
	syntax_assert(typeof fn !== "undefined", node, `Cannot export undeclared function ${fn_name}`);
	
	if (fn instanceof FunctionDeclaration) {
		for (const { name, type } of fn.parameters) {
			syntax_assert(type.is_exportable(), node, `Cannot export function ${fn_name} because the parameter ${name} is not an exportable type`);
		}
		syntax_assert(fn.type.is_exportable(), node, `Cannot export function ${fn_name} because the return value is not an exportable type`);
	}
	else {
		syntax_error(node, `Cannot export ${fn_name} as it's not a function`);
	}

	ctx.define_export(node, fn_name);

	return new WASTExportNode(node, "function", fn_name, fn.id);
}

function wrap_exported_function(compiler: Compiler, node: AST, name: string) {
	const ctx = compiler.ctx;
	const fn = ctx.get_function(name)!;
	
	syntax_assert(is_defined(fn), node, `Cannot export undeclared function ${name}`);

	const wrapper_fn_decl = ctx.declare_hidden_function(name, fn.type, fn.parameters);
	const fn_wast = initialise_function_environment(node, ctx, wrapper_fn_decl);

	const args: Array<WASTExpressionNode> = [];

	for (const param of wrapper_fn_decl.parameters) {
		args.push(new WASTGetLocalNode(node, param.id, param.name, param.type));
	}

	const call_node = new WASTCallNode(node, fn.id, name, fn.type, args);

	// TODO this is intended to allow functions called by the host environment to
	// include a prefix/postfix template, but we dont' do this yet. The idea being
	// that we can use a bump allocator for malloc which resets once we exit to the
	// host environment
	fn_wast.body.nodes.push(
		call_node
	);

	complete_function_environment(compiler, fn_wast, wrapper_fn_decl);
	
	return fn_wast;
}