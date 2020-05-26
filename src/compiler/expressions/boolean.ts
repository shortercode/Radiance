import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, WASTConstNode, WASTNotEqualsNode, WASTNotNode, Ref } from "../../WASTNode";
import { BOOL_TYPE } from "../LangType";
import { compiler_error, type_error } from "../error";

export function visit_boolean_expression (_compiler: Compiler, node: AST, _type_hint: TypeHint): WASTExpressionNode {
	const value = node.data as string;
	const type = BOOL_TYPE;
	const ref = Ref.from_node(node);

	if (value === "false") {
		return new WASTConstNode(ref, type, "0");
	}
	else if (value === "true") {
		return new WASTConstNode(ref, type, "1");
	}
	else {
		compiler_error(node, "Invalid boolean value");
	}
}

export function ensure_expression_emits_boolean(expr: WASTExpressionNode): WASTExpressionNode {
	if (expr.value_type.is_boolean()) {
		return wrap_boolean_cast(expr.source, expr);
	}
	else {
		return expr;
	}
}

export function wrap_boolean_cast(ref: Ref, expr: WASTExpressionNode): WASTExpressionNode {
	const type = expr.value_type;
	if (type.is_boolean()) {
		return expr;
	}
	else if (type.is_numeric()) {
		const zero = new WASTConstNode(ref, type, "0");
		return new WASTNotEqualsNode(ref, zero, expr);
	}

	type_error(expr.source, `unable to cast expression to boolean`);
}

export function invert_boolean_expression (expr: WASTExpressionNode) {
	// NOTE as an optmisation if it's
	// already inverted (e.g. while !false {} ) then we just remove that
	// inversion
	if (expr instanceof WASTNotNode) {
		return expr.inner;
	}
	else {
		// NOTE otherwise ensure that we have a boolean value then invert
		// invert it
		const boolean_expr = ensure_expression_emits_boolean(expr);
		return new WASTNotNode(expr.source, boolean_expr);
	}
}