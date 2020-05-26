import { FunctionContext } from "../FunctionContext";
import { Opcode } from "../OpCode";
import { write_binary_prefix } from "./binary";
import { WASTExpressionNode, WASTBinaryExpressionNode } from "../../WASTNode";
import { PrimativeTypes } from "../../compiler/LangType";
import { compiler_error } from "../../compiler/error";

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
		case PrimativeTypes.u32:
		ctx.writer.writeUint8(Opcode.i32_div_u);
		break;
		case PrimativeTypes.u64:
		ctx.writer.writeUint8(Opcode.i64_div_u);
		break;
		default:
		compiler_error(node.source, `Invalid primative for ${node.type} ${node.value_type.name}`);
	}
}