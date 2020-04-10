import { FunctionContext } from "../FunctionContext.js";
import { Opcode } from "../OpCode.js";
import { write_binary_prefix } from "./binary.js";
import { WASTExpressionNode, WASTBinaryExpressionNode } from "../../WASTNode.js";

export function write_shift_right_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	write_binary_prefix(ctx, node as WASTBinaryExpressionNode);
	
	switch (node.value_type) {
		case "i32":
		ctx.writer.writeUint8(Opcode.i32_shr_u);
		break;
		case "i64":
		ctx.writer.writeUint8(Opcode.i64_shr_u);
		break;
	}
}