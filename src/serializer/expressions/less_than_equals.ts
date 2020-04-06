import { write_binary_prefix } from "./binary.js";
import { Opcode } from "../OpCode.js";
import { FunctionContext } from "../FunctionContext.js";
import { WASTExpressionNode, WASTBinaryExpressionNode } from "../../WASTNode.js";

export function write_less_than_equals_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	write_binary_prefix(ctx, node as WASTBinaryExpressionNode, "boolean");

	switch (node.value_type) {
		case "f32":
			ctx.writer.writeUint8(Opcode.f32_le);
			break;
		case "f64":
			ctx.writer.writeUint8(Opcode.f64_le);
			break;
		case "i32":
			ctx.writer.writeUint8(Opcode.i32_le_s);
			break;
		case "i64":
			ctx.writer.writeUint8(Opcode.i64_le_s);
			break;
	}
}