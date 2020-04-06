import { FunctionContext } from "../FunctionContext.js";
import { Opcode } from "../OpCode.js";
import { WASTSubNode, WASTExpressionNode, WASTBinaryExpressionNode } from "../../WASTNode.js";
import { write_binary_prefix } from "./binary.js";

export function write_sub_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	write_binary_prefix(ctx, node as WASTBinaryExpressionNode, node.value_type);

	switch (node.value_type) {
		case "f32":
			ctx.writer.writeUint8(Opcode.f32_sub);
			break;
		case "f64":
			ctx.writer.writeUint8(Opcode.f64_sub);
			break;
		case "i32":
			ctx.writer.writeUint8(Opcode.i32_sub);
			break;
		case "i64":
			ctx.writer.writeUint8(Opcode.i64_sub);
			break;
	}
}