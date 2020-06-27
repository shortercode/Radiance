import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, Ref, WASTGetVarNode } from "../../WASTNode";
import { syntax_assert, is_defined } from "../error";

export function visit_identifier_expression (compiler: Compiler, node: AST, _type_hint: TypeHint): WASTExpressionNode {
	const name = node.data as string;
	const variable = compiler.ctx.get_variable(Ref.from_node(node), name)!;

	syntax_assert(is_defined(variable), node, `Use of undeclared variable ${name}`);

	return new WASTGetVarNode(variable, Ref.from_node(node));
}