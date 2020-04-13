import { WASTExpressionNode, WASTLoopNode } from "../../WASTNode";
import { FunctionContext } from "../FunctionContext";
import { Opcode } from "../OpCode";
import { write_value_type } from "../write_value_type";
import { write_expression } from "./expression";
import { parse_type } from "../../compiler/AtiumType";

export function write_loop_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	
	const loop_node = node as WASTLoopNode;
	const loop_statements = loop_node.body;
	
	ctx.writer.writeUint8(Opcode.loop);
	write_value_type(ctx.writer, parse_type("void"));
	
	for (const subnode of loop_statements) {
		write_expression(ctx, subnode);
		if (subnode.value_type.is_void() === false) {
			ctx.consume_any_value();
			ctx.writer.writeUint8(Opcode.drop);
		}
	}
	
	if (ctx.stack_depth !== 0) {
		throw new Error(`Expected no values on the stack, but found ${ctx.stack_depth}`);
	}
	
	ctx.writer.writeUint8(Opcode.end);
}