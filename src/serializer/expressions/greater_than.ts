import { write_binary_prefix } from "./binary.js";
import { Opcode } from "../OpCode.js";
import { FunctionContext } from "../FunctionContext.js";
import { WASTExpressionNode, WASTBinaryExpressionNode } from "../../WASTNode.js";
import { compiler_error } from "../../compiler/error.js";
import { PrimativeTypes } from "../../compiler/AtiumType.js";

export function write_greater_than_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	const inner_type = write_binary_prefix(ctx, node as WASTBinaryExpressionNode);
	
	switch (inner_type.wasm_type()) {
		case PrimativeTypes.f32:
		ctx.writer.writeUint8(Opcode.f32_gt);
		break;
		case PrimativeTypes.f64:
		ctx.writer.writeUint8(Opcode.f64_gt);
		break;
		case PrimativeTypes.i32:
		ctx.writer.writeUint8(Opcode.i32_gt_s);
		break;
		case PrimativeTypes.i64:
		ctx.writer.writeUint8(Opcode.i64_gt_s);
		break;
		default:
		compiler_error(node.source, `Invalid primative for ${node.type} ${node.value_type.name}`);
	}
}