import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, WASTCallNode } from "../../WASTNode";
import { type_assert, syntax_assert, is_defined } from "../error";

function read_node_data (node: AST) {
	return node.data as {
		callee: AST,
		arguments: Array<AST>
	};
}

export function visit_call_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const value = read_node_data(node);
	
	type_assert(value.callee.type === "identifier", node, `${value.callee.type} is not a function`);
	
	const function_name = value.callee.data as string;
	const fn = compiler.ctx.get_function(function_name)!;
	
	syntax_assert(is_defined(fn), node, `Cannot call undeclared function ${function_name}`)

	const args: Array<WASTExpressionNode> = [];
	
	const arg_count = value.arguments.length;
	const param_count = fn.parameters.length;

	syntax_assert(arg_count === param_count, node, `Function ${function_name} expects ${param_count} arguments but ${arg_count} were given`);

	for (let i = 0; i < param_count; i++) {
		const arg = value.arguments[i];
		const param = fn.parameters[i];
		const expr = compiler.visit_expression(arg, param.type);

		type_assert(expr.value_type.equals(param.type), node, `Argument of type ${arg.type} is not assignable to parameter of type ${param.type.name}`);
		
		args.push(expr);
	}
	
	return new WASTCallNode(node, fn.id, function_name, fn.type, args)
}