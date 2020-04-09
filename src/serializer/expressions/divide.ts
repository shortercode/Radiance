import { FunctionContext } from "../FunctionContext.js";
import { Opcode } from "../OpCode.js";
import { write_binary_prefix } from "./binary.js";
import { WASTExpressionNode, WASTBinaryExpressionNode } from "../../WASTNode.js";

export function write_divide_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	write_binary_prefix(ctx, node as WASTBinaryExpressionNode);

	switch (node.value_type) {
		case "f32":
			ctx.writer.writeUint8(Opcode.f32_div);
			break;
		case "f64":
			ctx.writer.writeUint8(Opcode.f64_div);
			break;
		case "i32":
			ctx.writer.writeUint8(Opcode.i32_div_s);
			break;
		case "i64":
			ctx.writer.writeUint8(Opcode.i64_div_s);
			break;
	}
}