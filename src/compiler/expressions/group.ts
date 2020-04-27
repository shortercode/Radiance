import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode } from "../../WASTNode";

export function visit_group_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const inner = node.data as AST;
	return compiler.visit_expression(inner, type_hint);
}