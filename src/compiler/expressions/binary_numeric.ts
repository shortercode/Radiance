import { visit_binary_expresson } from "./binary";
import { WASTEqualsNode, WASTExpressionNode, WASTNotEqualsNode, WASTLessThanNode, WASTGreaterThanNode, WASTLessThanEqualsNode, WASTGreaterThanEqualsNode, WASTAddNode, WASTMultiplyNode, WASTSubNode, WASTDivideNode } from "../../WASTNode";
import { type_assert } from "../error";
import { Compiler, AST, TypeHint } from "../core";

// NOTE the type_hint for comparisons will be "boolean" which the children don't
// care about. So pass null to the inner expressions

export function visit_equality_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const { left, right, source } = visit_numeric_binary_expression(compiler, node, null);
	return new WASTEqualsNode(source, left, right);
}

export function visit_inequality_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const { left, right, source } = visit_numeric_binary_expression(compiler, node, null);
	return new WASTNotEqualsNode(source, left, right);
}

export function visit_less_than_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const { left, right, source } = visit_numeric_binary_expression(compiler, node, null);
	return new WASTLessThanNode(source, left, right);
}

export function visit_greater_than_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const { left, right, source } = visit_numeric_binary_expression(compiler, node, null);
	return new WASTGreaterThanNode(source, left, right);
}

export function visit_less_than_equals_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const { left, right, source } = visit_numeric_binary_expression(compiler, node, null);
	return new WASTLessThanEqualsNode(source, left, right);
}

export function visit_greater_than_equals_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const { left, right, source } = visit_numeric_binary_expression(compiler, node, null);
	return new WASTGreaterThanEqualsNode(source, left, right);
}

export function visit_addition_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const { type, left, right, source } = visit_numeric_binary_expression(compiler, node, type_hint);
	return new WASTAddNode(source, type, left, right);
}

export function visit_subtraction_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const { type, left, right, source } = visit_numeric_binary_expression(compiler, node, type_hint);
	return new WASTSubNode(source, type, left, right);

}

export function visit_multiplication_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const { type, left, right, source } = visit_numeric_binary_expression(compiler, node, type_hint);
	return new WASTMultiplyNode(source, type, left, right);
}

export function visit_division_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const { type, left, right, source } = visit_numeric_binary_expression(compiler, node, type_hint);
	return new WASTDivideNode(source, type, left, right);
}

function visit_numeric_binary_expression (ctx: Compiler, node: AST, type_hint: TypeHint) {
	const result = visit_binary_expresson(ctx, node, type_hint);
	const type = result.type;
	const operand = node.type;
	
	type_assert(result.type.is_numeric(), node,`Unable to perform operation ${operand} on non-numeric types ${type.name} ${type.name}`);

	return result;
}