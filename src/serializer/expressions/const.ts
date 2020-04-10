import { WASTExpressionNode, WASTConstNode } from "../../WASTNode";
import { FunctionContext } from "../FunctionContext";
import { Opcode } from "../OpCode";

export function write_const_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	
	const const_node = node as WASTConstNode;
	ctx.push_value(const_node.value_type);
	
	switch (const_node.value_type) {
		case "f32":
		ctx.writer.writeUint8(Opcode.f32_const);
		ctx.writer.writeFloat32(parseFloat(const_node.value));
		break;
		case "f64":
		ctx.writer.writeUint8(Opcode.f64_const);
		ctx.writer.writeFloat64(parseFloat(const_node.value));
		break;
		case "boolean":
		case "i32":
		ctx.writer.writeUint8(Opcode.i32_const);
		ctx.writer.writeUVint(parseInt(const_node.value, 10));
		break;
		case "i64":
		ctx.writer.writeUint8(Opcode.i64_const);
		// WARN node.value may not fit into a JS number literal!
		// which would cause this to input the wrong number
		ctx.writer.writeUVint(parseInt(const_node.value, 10));
		break;
	}
}