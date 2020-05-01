import { FunctionContext } from "../FunctionContext";
import { Opcode } from "../OpCode";
import { write_binary_prefix } from "./binary";
import { WASTExpressionNode, WASTBinaryExpressionNode } from "../../WASTNode";
import { PrimativeTypes } from "../../compiler/AtiumType";
import { compiler_error } from "../../compiler/error";

type WriteExpression = (ctx: FunctionContext, node: WASTExpressionNode) => void;

export function write_bitwise_or_expression(ctx: FunctionContext, node: WASTExpressionNode, write_expression: WriteExpression) {
	write_binary_prefix(ctx, node as WASTBinaryExpressionNode, write_expression);
	
	switch (node.value_type.wasm_type()) {
		case PrimativeTypes.i32:
		case PrimativeTypes.u32:
		case PrimativeTypes.boolean:
		ctx.writer.writeUint8(Opcode.i32_or);
		break;
		case PrimativeTypes.i64:
		case PrimativeTypes.u64:
		ctx.writer.writeUint8(Opcode.i64_or);
		break;
		default:
		compiler_error(node.source, `Invalid primative for ${node.type} ${node.value_type.name}`);
	}
}