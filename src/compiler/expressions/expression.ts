import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode } from "../../WASTNode";

export function visit_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	return compiler.visit_expression(node.data as AST, type_hint);
}