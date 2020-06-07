import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, WASTGlobalExpression, Ref, WASTStatementNode } from "../../WASTNode";

export function visit_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	return compiler.visit_expression(node.data as AST, type_hint);
}

export function visit_global_expression  (compiler: Compiler, node: AST): Array<WASTStatementNode> {
	return [
		new WASTGlobalExpression(Ref.from_node(node), compiler.visit_expression(node.data as AST, null))
	];
}