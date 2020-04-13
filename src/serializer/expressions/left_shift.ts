import { FunctionContext } from "../FunctionContext.js";
import { Opcode } from "../OpCode.js";
import { write_binary_prefix } from "./binary.js";
import { WASTExpressionNode, WASTBinaryExpressionNode } from "../../WASTNode.js";
import { compiler_error } from "../../compiler/error.js";
import { PrimativeTypes } from "../../compiler/AtiumType.js";

export function write_shift_left_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	write_binary_prefix(ctx, node as WASTBinaryExpressionNode);
	
	switch (node.value_type.wasm_type()) {
		case PrimativeTypes.i32:
		ctx.writer.writeUint8(Opcode.i32_shl);
		break;
		case PrimativeTypes.i64:
		ctx.writer.writeUint8(Opcode.i64_shl);
		break;
		default:
		compiler_error(node.source, `Invalid primative for ${node.type} ${node.value_type.name}`);
	}
}