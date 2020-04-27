import { Compiler, TypeHint, AST } from "../core";
import { InferContext } from "../InferContext";
import { guess_expression_type } from "../inference";
import { type_assert } from "../error";

function read_node_data (node: AST) {
	return node.data as {
		left: AST,
		right: AST
	}	
}

export function visit_binary_expresson (compiler: Compiler, node: AST, type_hint: TypeHint) {
	const data = read_node_data(node);

	if (!type_hint) {
		const infer_ctx = new InferContext(compiler.ctx);
		const left_type = guess_expression_type(data.left, infer_ctx);
		const right_type = guess_expression_type(data.right, infer_ctx);
		// FIXME this needs fixing up; if left is an i32 literal and right is a f64
		// literal then it will hint both should be ints and loose the fractional
		// part with no warnings
		type_hint = left_type || right_type;
	}
	
	const left = compiler.visit_expression(data.left, type_hint);
	const right = compiler.visit_expression(data.right, type_hint);
	
	const operand = node.type;
	type_assert(left.value_type.equals(right.value_type), node, `Mismatched operand types for "${operand}" ${left.value_type.name} != ${right.value_type.name})`)
	
	return {
		type: left.value_type,
		left,
		right
	};
}