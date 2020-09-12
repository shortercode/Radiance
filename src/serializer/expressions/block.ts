import { WASTExpressionNode, WASTBlockNode } from "../../WASTNode";
import { FunctionContext } from "../FunctionContext";
import { Opcode } from "../OpCode";
import { write_value_type } from "../write_value_type";

type WriteExpression = (ctx: FunctionContext, node: WASTExpressionNode) => void;

export function write_block_expression(ctx: FunctionContext, node: WASTExpressionNode, write_expression: WriteExpression) {
	
	const block_node = node as WASTBlockNode;
	
	ctx.writer.writeUint8(Opcode.block);
	write_value_type(ctx.writer, block_node.value_type);
	
	write_expression(ctx, block_node.body);
	if (block_node.does_return_value) {
		ctx.push_value(block_node.value_type.wasm_type());
	}
	
	ctx.writer.writeUint8(Opcode.end);
}