import { write_binary_prefix } from "./binary";
import { Opcode } from "../OpCode";
import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTBinaryExpressionNode } from "../../WASTNode";
import { compiler_error } from "../../compiler/error";
import { PrimativeTypes } from "../../compiler/AtiumType";

type WriteExpression = (ctx: FunctionContext, node: WASTExpressionNode) => void;

export function write_less_than_expression(ctx: FunctionContext, node: WASTExpressionNode, write_expression: WriteExpression) {
	const inner_type = write_binary_prefix(ctx, node as WASTBinaryExpressionNode, write_expression);
	
	switch (inner_type.wasm_type()) {
		case PrimativeTypes.f32:
		ctx.writer.writeUint8(Opcode.f32_lt);
		break;
		case PrimativeTypes.f64:
		ctx.writer.writeUint8(Opcode.f64_lt);
		break;
		case PrimativeTypes.i32:
		ctx.writer.writeUint8(Opcode.i32_lt_s);
		break;
		case PrimativeTypes.i64:
		ctx.writer.writeUint8(Opcode.i64_lt_s);
		break;
		case PrimativeTypes.u32:
		ctx.writer.writeUint8(Opcode.i32_lt_u);
		break;
		case PrimativeTypes.u64:
		ctx.writer.writeUint8(Opcode.i64_lt_u);
		break;
		default:
		compiler_error(node.source, `Invalid primative for ${node.type} ${node.value_type.name}`);
	}
}