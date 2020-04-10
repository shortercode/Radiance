import { write_binary_prefix } from "./binary.js";
import { Opcode } from "../OpCode.js";
import { FunctionContext } from "../FunctionContext.js";
import { WASTExpressionNode, WASTBinaryExpressionNode } from "../../WASTNode.js";

export function write_greater_than_equals_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	const inner_type = write_binary_prefix(ctx, node as WASTBinaryExpressionNode);
	
	switch (inner_type) {
		case "f32":
		ctx.writer.writeUint8(Opcode.f32_ge);
		break;
		case "f64":
		ctx.writer.writeUint8(Opcode.f64_ge);
		break;
		case "i32":
		ctx.writer.writeUint8(Opcode.i32_ge_s);
		break;
		case "i64":
		ctx.writer.writeUint8(Opcode.i64_ge_s);
		break;
	}
}