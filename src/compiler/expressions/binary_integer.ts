import { visit_binary_expresson } from "./binary";
import { type_assert } from "../error";
import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, WASTLeftShiftNode, WASTRightShiftNode, WASTModuloNode } from "../../WASTNode";

export function visit_remainder_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const { type, left, right, source } = visit_integer_binary_expression(compiler, node, type_hint);

	return new WASTModuloNode(source, type, left, right);
}

export function visit_left_shift_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const { type, left, right, source } = visit_integer_binary_expression(compiler, node, type_hint);
	return new WASTLeftShiftNode(source, type, left, right);
}

export function visit_right_shift_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const { type, left, right, source } = visit_integer_binary_expression(compiler, node, type_hint);
	return new WASTRightShiftNode(source, type, left, right);
}

function visit_integer_binary_expression (compiler: Compiler, node: AST, type_hint: TypeHint) {
	const checked_type_hint = type_hint?.is_integer() ? type_hint : null;
	const result = visit_binary_expresson(compiler, node, checked_type_hint);
	const type = result.type;
	const operand = node.type;
	
	type_assert(result.type.is_integer(), node,`Unable to perform operation ${operand} on non-integer types ${type.name} ${type.name}`);
	
	return result;
}