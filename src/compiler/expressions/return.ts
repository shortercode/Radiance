import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, Ref, WASTReturnNode } from "../../WASTNode";
import { type_assert, syntax_assert } from "../error";
import { VOID_TYPE } from "../LangType";

export function visit_return_statement (compiler: Compiler, node: AST, _type_hint: TypeHint): WASTExpressionNode {
	const expr_node = node.data as AST | null;
	const ref = Ref.from_node(node);

	syntax_assert(compiler.ctx.fn_env !== null, ref, `Illegal return statement`);
	const fn_type = compiler.ctx.fn_env!.fn;
	const return_type = fn_type.type;

	if (expr_node) {
		const expr = compiler.visit_expression(expr_node, return_type);

		type_assert(return_type.equals(expr.value_type), ref, `Unable to return type "${expr.value_type.name}" from ${fn_type.name} as it is not assignable to "${return_type.name}"`);
		return new WASTReturnNode(ref, expr);
	}
	else {
		type_assert(VOID_TYPE.equals(return_type), ref, `Unable to return type "${VOID_TYPE.name}" from ${fn_type.name} as it is not assignable to "${return_type.name}"`);

		return new WASTReturnNode(ref, null);
	}
}