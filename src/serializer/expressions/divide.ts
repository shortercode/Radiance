import { FunctionContext } from "../FunctionContext.js";
import { Opcode } from "../OpCode.js";
import { write_binary_prefix } from "./binary.js";
import { WASTExpressionNode, WASTBinaryExpressionNode } from "../../WASTNode.js";
import { PrimativeTypes } from "../../compiler/AtiumType.js";
import { compiler_error } from "../../compiler/error.js";

type WriteExpression = (ctx: FunctionContext, node: WASTExpressionNode) => void;

export function write_divide_expression(ctx: FunctionContext, node: WASTExpressionNode, write_expression: WriteExpression) {
	write_binary_prefix(ctx, node as WASTBinaryExpressionNode, write_expression);
	
	switch (node.value_type.wasm_type()) {
		case PrimativeTypes.f32:
		ctx.writer.writeUint8(Opcode.f32_div);
		break;
		case PrimativeTypes.f64:
		ctx.writer.writeUint8(Opcode.f64_div);
		break;
		case PrimativeTypes.i32:
		ctx.writer.writeUint8(Opcode.i32_div_s);
		break;
		case PrimativeTypes.i64:
		ctx.writer.writeUint8(Opcode.i64_div_s);
		break;
		default:
		compiler_error(node.source, `Invalid primative for ${node.type} ${node.value_type.name}`);
	}
}