import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTBreakNode } from "../../WASTNode";
import { Opcode } from "../OpCode";

type WriteExpression = (ctx: FunctionContext, node: WASTExpressionNode) => void;

export function write_break_expression(ctx: FunctionContext, node: WASTExpressionNode, write_expression: WriteExpression) {
	const br_node = node as WASTBreakNode;
	if (br_node.value) {
		// TODO validate that we can break with this value
		write_expression(ctx, br_node.value);
		ctx.consume_value(br_node.break_type.wasm_type(), node.source);
	}
	ctx.writer.writeUint8(Opcode.br);
	ctx.writer.writeUVint(br_node.index);
}