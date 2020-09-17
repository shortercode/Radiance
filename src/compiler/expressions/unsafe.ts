import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, Ref } from "../../WASTNode";
import { syntax_assert } from "../error";
import { UnsafeNode } from "../../parser/ast";

export function visit_unsafe_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const block = (node as UnsafeNode).data;

	syntax_assert(compiler.ctx.unsafe_mode === false, Ref.from_node(node), `Current context is already unsafe`);
	
	compiler.ctx.unsafe_mode = true;
	const body = compiler.visit_expression(block, type_hint);
	compiler.ctx.unsafe_mode = false;

	return body;
}