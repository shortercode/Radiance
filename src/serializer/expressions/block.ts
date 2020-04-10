import { WASTExpressionNode, WASTBlockNode } from "../../WASTNode";
import { FunctionContext } from "../FunctionContext";
import { Opcode } from "../OpCode";
import { write_value_type } from "../write_value_type";
import { write_expression } from "./expression";

export function write_block_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	
	const block_node = node as WASTBlockNode;
	
	ctx.writer.writeUint8(Opcode.block);
	write_value_type(ctx.writer, block_node.value_type);
	
	write_expression(ctx, block_node.body);
	
	ctx.writer.writeUint8(Opcode.end);
}