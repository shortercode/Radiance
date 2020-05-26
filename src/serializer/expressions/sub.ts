import { FunctionContext } from "../FunctionContext";
import { Opcode } from "../OpCode";
import { WASTExpressionNode, WASTBinaryExpressionNode } from "../../WASTNode";
import { write_binary_prefix } from "./binary";
import { compiler_error } from "../../compiler/error";
import { PrimativeTypes } from "../../compiler/LangType";

type WriteExpression = (ctx: FunctionContext, node: WASTExpressionNode) => void;

export function write_sub_expression(ctx: FunctionContext, node: WASTExpressionNode, write_expression: WriteExpression) {
	write_binary_prefix(ctx, node as WASTBinaryExpressionNode, write_expression);
	
	switch (node.value_type.wasm_type()) {
		case PrimativeTypes.f32:
		ctx.writer.writeUint8(Opcode.f32_sub);
		break;
		case PrimativeTypes.f64:
		ctx.writer.writeUint8(Opcode.f64_sub);
		break;
		case PrimativeTypes.u32:
		case PrimativeTypes.i32:
		ctx.writer.writeUint8(Opcode.i32_sub);
		break;
		case PrimativeTypes.u64:
		case PrimativeTypes.i64:
		ctx.writer.writeUint8(Opcode.i64_sub);
		break;
		default:
		compiler_error(node.source, `Invalid primative for ${node.type} ${node.value_type.name}`);
	}
}