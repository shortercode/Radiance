import { FunctionContext } from "../FunctionContext";
import { Opcode } from "../OpCode";
import { WASTExpressionNode, WASTReturnNode } from "../../WASTNode";

type WriteExpression = (ctx: FunctionContext, node: WASTExpressionNode) => void;

export function write_return_expression(ctx: FunctionContext, node: WASTExpressionNode, write_expression: WriteExpression) {
	const data = node as WASTReturnNode;
	if (data.value !== null) {
		write_expression(ctx, data.value);
		ctx.consume_any_value(node.source);
	}
	ctx.writer.writeUint8(Opcode.return);
}