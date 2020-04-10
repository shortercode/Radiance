import { FunctionContext } from "../FunctionContext";
import { WASTBinaryExpressionNode } from "../../WASTNode.js";
import { write_expression } from "./expression";
import { AtiumType } from "../../compiler/AtiumType";

export function write_binary_prefix(ctx: FunctionContext, node: WASTBinaryExpressionNode): AtiumType {
	write_expression(ctx, node.left);
	write_expression(ctx, node.right);
	
	const left_value_type = node.left.value_type;
	const right_value_type = node.right.value_type;
	
	if (left_value_type !== right_value_type) {
		throw new Error(`Mismatched types in Binary expression (${node.type} (${left_value_type})(${right_value_type})`);
	}
	
	ctx.consume_value(left_value_type);
	ctx.consume_value(right_value_type);
	ctx.push_value(node.value_type);
	
	return left_value_type
}