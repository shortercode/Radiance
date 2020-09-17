import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode } from "../../WASTNode";
import { GroupingNode } from "../../parser/ast";

export function visit_group_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const inner = (node as GroupingNode).data;
	return compiler.visit_expression(inner, type_hint);
}