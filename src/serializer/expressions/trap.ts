import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTTrapNode } from "../../WASTNode";
import { Opcode } from "../OpCode";

export function write_trap_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	const trap_node = node as WASTTrapNode;
	// WARN this does not reset the stack_depth variable
	ctx.writer.writeUint8(Opcode.unreachable);
}