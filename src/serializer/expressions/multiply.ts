import { FunctionContext } from "../FunctionContext.js";
import { Opcode } from "../OpCode.js";
import { write_binary_prefix } from "./binary.js";
import { WASTExpressionNode, WASTBinaryExpressionNode } from "../../WASTNode.js";

export function write_multiply_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	write_binary_prefix(ctx, node as WASTBinaryExpressionNode, node.value_type);

	switch (node.value_type) {
		case "f32":
			ctx.writer.writeUint8(Opcode.f32_mul);
			break;
		case "f64":
			ctx.writer.writeUint8(Opcode.f64_mul);
			break;
		case "i32":
			ctx.writer.writeUint8(Opcode.i32_mul);
			break;
		case "i64":
			ctx.writer.writeUint8(Opcode.i64_mul);
			break;
	}
}