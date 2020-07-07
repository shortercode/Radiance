import { Compiler, AST } from "../core";
import { TypePattern } from "../../parser/index";
import { Context } from "../Context";
import { FunctionDeclaration } from "../FunctionDeclaration";
import { compiler_assert, is_defined, type_assert, syntax_assert, compiler_error } from "../error";
import { WASTFunctionNode, WASTStatementNode, Ref, WASTTrapNode } from "../../WASTNode";
import { parse_type } from "../LangType";
import { Variable } from "../Variable";
import { FunctionEnvironment } from "../Environment";
import { FunctionTemplateInstance } from "../FunctionTemplateInstance";

function read_node_data (node: AST) {
	return node.data as {
		name: string
		type: TypePattern
		generics: string[]
		body: Array<AST>
		parameters: Array<{ name: string, type: TypePattern }>
	}
}

export function hoist_imported_function_declaration (compiler: Compiler, node: AST) {
	const data = read_node_data(node);
	const ctx = compiler.ctx;
	const ref = Ref.from_node(node);

	const parameters = data.parameters.map(param => {
		const type = parse_type(param.type, ctx);
		return new Variable(ref, type, param.name);
	});

	const return_type = parse_type(data.type, compiler.ctx);
	ctx.declare_function(ref, data.name, return_type, parameters);
}

export function hoist_function_declaration (compiler: Compiler, node: AST) {
	const data = read_node_data(node);
	const ctx = compiler.ctx;
	const ref = Ref.from_node(node);

	if (data.generics.length > 0) {
		ctx.declare_function_template(ref, data.name, data.type, data.parameters, data.generics, data.body);
	}
	else {
		const parameters = data.parameters.map(param => {
			const type = parse_type(param.type, ctx);
			return new Variable(ref, type, param.name);
		});
	
		const return_type = parse_type(data.type, compiler.ctx);
		ctx.declare_function(ref, data.name, return_type, parameters);
	}
}

export function visit_function (compiler: Compiler, node: AST): Array<WASTStatementNode> {
	const data = read_node_data(node);
	const ref = Ref.from_node(node);

	if (data.generics.length > 0) {
		return [];
	}
	
	const fn_decl = compiler.ctx.get_function(data.name)!; 
	
	compiler_assert(is_defined(fn_decl), node, "Cannot locate function declaration");

	const fn_wast = initialise_function_environment(ref, compiler.ctx, fn_decl);
	
	const last = data.body.slice(-1)[0];
	const rest = data.body.slice(0, -1);

	for (const node of rest) {
		const expr = compiler.visit_local_statement(node, null);
		fn_wast.body.nodes.push(expr);
		syntax_assert(expr.value_type.is_never() === false, expr.source, "Early exit in this statement leaves unreachable code after it");
	}

	if (last) {
		const expr = compiler.visit_local_statement(last, fn_decl.type);
		fn_wast.body.nodes.push(expr);
	}

	complete_function_environment(compiler, fn_wast, fn_decl);

	return [fn_wast];
}

export function visit_function_instance (compiler: Compiler, ref: Ref, inst: FunctionTemplateInstance): WASTStatementNode {
	const fn_wast = initialise_function_environment(ref, compiler.ctx, inst);
	
	const last = inst.body.slice(-1)[0];
	const rest = inst.body.slice(0, -1);

	for (const node of rest) {
		const expr = compiler.visit_local_statement(node, null);
		fn_wast.body.nodes.push(expr);
		syntax_assert(expr.value_type.is_never() === false, expr.source, "Early exit in this statement leaves unreachable code after it");
	}

	if (last) {
		const expr = compiler.visit_local_statement(last, inst.type);
		fn_wast.body.nodes.push(expr);
	}

	complete_function_environment(compiler, fn_wast, inst);

	return fn_wast;
}

export function initialise_function_environment(ref: Ref, ctx: Context, decl: FunctionDeclaration) {
	const fn_wast = new WASTFunctionNode(ref, decl.id, decl.name, decl.type);
	
	ctx.fn_env = new FunctionEnvironment(decl);
	
	for (const variable of decl.parameters) {
		fn_wast.parameters.push(variable);
	}

	return fn_wast;
}

export function complete_function_environment (compiler: Compiler, fn_wast: WASTFunctionNode, fn_decl: FunctionDeclaration) {
	const ctx = compiler.ctx;
	const fn_body = fn_wast.body;
	const body_node_count = fn_body.nodes.length;

	if (!ctx.fn_env) {
		compiler_error(fn_wast.source, `Unable to complete function environment, the environment has already been cleared`);
	}

	if (body_node_count > 0) {
		const last_node = fn_body.nodes[body_node_count - 1];
		fn_body.value_type = last_node.value_type;
	}

	if (fn_body.value_type.is_never()) {
		/*
			while the insertion of a "unreachable" node isn't required at runtime it is required to pass
			validation during module initialisation. this is because the return statement exits the normal
			flow of the function, hence there isn't a value on the stack at the end of the function body.
			this could be resolved by modifying the compiled code to match the implicit form where suitable.
			But the easier solution is to add an unreachable opcode, which skips the stack validation.

			Example:

			fn main -> u32 {
				if true {
					return 1
				}
				else {
					return 2
				}
			}

			Compiles to:

			(if void
				(list (const 1) (return))
				(list (const 2) (return))
			)
			// stack depth is 0 here
		*/
		fn_body.nodes.push(new WASTTrapNode(fn_body.source));
		fn_body.consume_return_value()
	}
	else if (fn_decl.type.is_void()) {
		fn_body.consume_return_value();
	}
	else {
		type_assert(fn_decl.type.equals(fn_wast.body.value_type), fn_wast.source, `Unable to return type "${fn_wast.body.value_type.name}" from ${fn_decl.name} as it is not assignable to "${fn_decl.type.name}"`);
	}
	
	const locals = ctx.fn_env.variables;

	for (const local of locals) {
		fn_wast.locals.push(local);
	}

	ctx.fn_env = null;
}