import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, Ref } from "../../WASTNode";
import { syntax_assert } from "../error";

export function visit_unsafe_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const block = node.data as AST;

	syntax_assert(compiler.ctx.is_unsafe === false, Ref.from_node(node), `Current context is already unsafe`);
	
	compiler.ctx.enable_unsafe();
	const body = compiler.visit_expression(block, type_hint);
	compiler.ctx.disable_unsafe();

	return body;
}