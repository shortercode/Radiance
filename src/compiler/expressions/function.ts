import { Compiler, AST } from "../core";
import { TypePattern } from "../../parser/index";
import { Context } from "../Context";
import { FunctionDeclaration } from "../FunctionDeclaration";
import { compiler_assert, is_defined, type_assert } from "../error";
import { WASTFunctionNode, WASTStatementNode, Ref } from "../../WASTNode";
import { Environment } from "../Environment";
import { parse_type } from "../LangType";
import { Variable } from "../Variable";

function read_node_data (node: AST) {
	return node.data as {
		name: string
		type: TypePattern
		body: Array<AST>
		parameters: Array<{ name: string, type: TypePattern }>
	}
}

export function hoist_function_declaration (compiler: Compiler, node: AST) {
	const data = read_node_data(node);
	const ctx = compiler.ctx;
	const ref = Ref.from_node(node);

	const parameters = data.parameters.map((param, index) => {
		const type = parse_type(param.type, ctx);
		return new Variable(ref, type, param.name, index);
	});

	const return_type = parse_type(data.type, compiler.ctx);
	ctx.declare_function(ref, data.name, return_type, parameters);
}

export function visit_function (compiler: Compiler, node: AST): Array<WASTStatementNode> {
	const data = read_node_data(node);
	const ref = Ref.from_node(node);
	
	const fn_decl = compiler.ctx.get_function(data.name)!; 
	
	compiler_assert(is_defined(fn_decl), node, "Cannot locate function declaration");

	const fn_wast = initialise_function_environment(ref, compiler.ctx, fn_decl);
	
	const last = data.body.slice(-1)[0];
	const rest = data.body.slice(0, -1);

	for (const node of rest) {
		const expr = compiler.visit_local_statement(node, null);
		fn_wast.body.nodes.push(expr);
	}

	if (last) {
		const expr = compiler.visit_local_statement(last, fn_decl.type);
		fn_wast.body.nodes.push(expr);
	}

	complete_function_environment(compiler, fn_wast, fn_decl);

	return [fn_wast];
}

export function initialise_function_environment(ref: Ref, ctx: Context, decl: FunctionDeclaration) {
	const fn_wast = new WASTFunctionNode(ref, decl.id, decl.name, decl.type);
	
	ctx.environment = new Environment(decl.parameters);
	
	for (const variable of decl.parameters) {
		fn_wast.parameters.push(variable);
	}

	return fn_wast;
}

export function complete_function_environment (compiler: Compiler, fn_wast: WASTFunctionNode, fn_decl: FunctionDeclaration) {
	const fn_body = fn_wast.body;
	const body_node_count = fn_body.nodes.length;

	if (body_node_count > 0) {
		const last_node = fn_body.nodes[body_node_count - 1];
		fn_body.value_type = last_node.value_type;
	}
	
	if (fn_decl.type.is_void()) {
		fn_wast.body.consume_return_value();
	}
	else {
		type_assert(fn_wast.body.value_type.equals(fn_decl.type), fn_wast.source, `Unable to return ${fn_wast.body.value_type.name} from ${fn_decl.name}`);
	}
	
	const ctx = compiler.ctx;
	const locals = ctx.environment!.variables;

	for (const local of locals) {
		fn_wast.locals.push(local);
	}

	ctx.environment = null;
}