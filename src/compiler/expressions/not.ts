import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode } from "../../WASTNode";
import { BOOL_TYPE } from "../AtiumType";
import { invert_boolean_expression } from "./boolean";

export function visit_not_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const value = node.data as {
		subnode: AST
	};

	const inner = compiler.visit_expression(value.subnode, BOOL_TYPE);
	return invert_boolean_expression(node, inner);
}