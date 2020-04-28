import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTTrapNode } from "../../WASTNode";
import { Opcode } from "../OpCode";

export function write_trap_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	const trap_node = node as WASTTrapNode;
	ctx.writer.writeUint8(Opcode.unreachable);
}