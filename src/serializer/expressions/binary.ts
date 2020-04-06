import { FunctionContext } from "../FunctionContext";
import { WASTBinaryExpressionNode } from "../../WASTNode.js";
import { write_expression } from "./expression";
import { AtiumType } from "../../compiler/AtiumType";

export function write_binary_prefix(ctx: FunctionContext, node: WASTBinaryExpressionNode, value_type: AtiumType) {
	write_expression(ctx, node.left);
	write_expression(ctx, node.right);

	ctx.consume_value(node.value_type);
	ctx.consume_value(node.value_type);
	ctx.push_value(value_type);
}