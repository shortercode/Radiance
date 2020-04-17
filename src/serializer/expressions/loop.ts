import { WASTExpressionNode, WASTLoopNode } from "../../WASTNode";
import { FunctionContext } from "../FunctionContext";
import { Opcode } from "../OpCode";
import { write_value_type } from "../write_value_type";

type WriteExpression = (ctx: FunctionContext, node: WASTExpressionNode) => void;

export function write_loop_expression(ctx: FunctionContext, node: WASTExpressionNode, write_expression: WriteExpression) {
	
	const loop_node = node as WASTLoopNode;
	const loop_statements = loop_node.body;
	
	ctx.writer.writeUint8(Opcode.loop);
	write_value_type(ctx.writer, loop_node.value_type);
	
	for (const subnode of loop_statements) {
		write_expression(ctx, subnode);
		if (subnode.value_type.is_void() === false) {
			ctx.consume_any_value(node.source);
			ctx.writer.writeUint8(Opcode.drop);
		}
	}
	
	if (ctx.stack_depth !== 0) {
		throw new Error(`Expected no values on the stack, but found ${ctx.stack_depth}`);
	}
	
	ctx.writer.writeUint8(Opcode.end);
}