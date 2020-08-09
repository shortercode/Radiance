import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, WASTCallNode, Ref } from "../../WASTNode";
import { type_assert, syntax_assert, is_defined, type_error } from "../error";
import { TypePattern } from "../../parser/index";
import { parse_type } from "../LangType";
import { FunctionTemplateDeclaration } from "../FunctionTemplateDeclaration";
import { FunctionDeclaration } from "../FunctionDeclaration";
import { FunctionTemplateInstance } from "../FunctionTemplateInstance";

function read_node_data (node: AST) {
	return node.data as {
		callee: AST
		arguments: AST[]
		generics: TypePattern[]
	};
}

export function visit_call_expression (compiler: Compiler, node: AST, _type_hint: TypeHint): WASTExpressionNode {
	const value = read_node_data(node);
	const ref = Ref.from_node(node);
	const ctx = compiler.ctx;
	
	type_assert(value.callee.type === "identifier", ref, `${value.callee.type} is not a function`);
	
	const function_name = value.callee.data as string;
	const fn = compiler.ctx.get_declaration(function_name)!;
	
	syntax_assert(is_defined(fn), ref, `Cannot call undeclared function ${function_name}`);

	let fn_inst: FunctionTemplateInstance | FunctionDeclaration;

	if (fn instanceof FunctionTemplateDeclaration) {
		const generic_parameters = value.generics.map(pattern => parse_type(pattern, ctx));
		fn_inst = fn.instance(ref, ctx, generic_parameters);
	}
	else if (fn instanceof FunctionDeclaration) {
		const count = value.generics.length;
		syntax_assert(count === 0, ref, `Function ${function_name} expects ${0} types but ${count} were given`);
		fn_inst = fn;
	}
	else {
		type_error(ref, `Cannot call ${function_name} as it's not a function`);
	}

	const args: Array<WASTExpressionNode> = [];
	
	const arg_count = value.arguments.length;
	const param_count = fn_inst.parameters.length;

	syntax_assert(arg_count === param_count, ref, `Function ${function_name} expects ${param_count} arguments but ${arg_count} were given`);

	for (let i = 0; i < param_count; i++) {
		const arg = value.arguments[i];
		const param = fn_inst.parameters[i];
		const expr = compiler.visit_expression(arg, param.type);

		type_assert(expr.value_type.equals(expr.value_type), ref, `Argument of type ${expr.value_type.name} is not assignable to parameter of type ${param.type.name}`);
		
		args.push(expr);
	}
	
	return new WASTCallNode(Ref.from_node(node), fn_inst.id, function_name, fn_inst.type, args)
}