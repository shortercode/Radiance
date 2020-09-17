import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, Ref, WASTGetVarNode } from "../../WASTNode";
import { syntax_assert, is_defined } from "../error";
import { LiteralNode } from "../../parser/ast";

export function visit_identifier_expression (compiler: Compiler, node: AST, _type_hint: TypeHint): WASTExpressionNode {
	const name = (node as LiteralNode<"identifier">).data;
	const variable = compiler.ctx.get_variable(name)!;

	syntax_assert(is_defined(variable), node, `Use of undeclared variable ${name}`);

	return new WASTGetVarNode(variable, Ref.from_node(node));
}