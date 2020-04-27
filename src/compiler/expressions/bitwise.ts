import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, WASTBitwiseAndNode, WASTBitwiseOrNode } from "../../WASTNode";
import { type_assert } from "../error";
import { visit_binary_expresson } from "./binary";

export function visit_bitwise_or_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const checked_type_hint = type_hint?.is_integer() || type_hint?.is_boolean() ? type_hint : null;
	const { left, right, type } = visit_binary_expresson(compiler, node, checked_type_hint);
	const operand = node.type;

	type_assert(type.is_integer() || type.is_boolean(), node, `Unable to perform operation ${operand} on non-integer or non-boolean types ${type.name} ${type.name}`);

	return new WASTBitwiseOrNode(node, type, left, right);
}

export function visit_bitwise_and_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const checked_type_hint = type_hint?.is_integer() || type_hint?.is_boolean() ? type_hint : null;
	const { left, right, type } = visit_binary_expresson(compiler, node, checked_type_hint);
	const operand = node.type;
	
	type_assert(type.is_integer() || type.is_boolean(), node, `Unable to perform operation ${operand} on non-integer or non-boolean types ${type.name} ${type.name}`);

	return new WASTBitwiseAndNode(node, type, left, right);
}