import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode } from "../../WASTNode";
import { Opcode } from "../OpCode";

export function write_trap_expression(ctx: FunctionContext, _node: WASTExpressionNode) {
	// WARN this does not reset the stack_depth variable
	ctx.writer.writeUint8(Opcode.unreachable);
}