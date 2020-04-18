import { FunctionContext } from "../FunctionContext";
import { Opcode } from "../OpCode";
import { write_binary_prefix } from "./binary";
import { WASTExpressionNode, WASTBinaryExpressionNode } from "../../WASTNode";
import { compiler_error } from "../../compiler/error";
import { PrimativeTypes } from "../../compiler/AtiumType";

type WriteExpression = (ctx: FunctionContext, node: WASTExpressionNode) => void;

export function write_modulo_expression(ctx: FunctionContext, node: WASTExpressionNode, write_expression: WriteExpression) {
	write_binary_prefix(ctx, node as WASTBinaryExpressionNode, write_expression);
	
	switch (node.value_type.wasm_type()) {
		case PrimativeTypes.i32:
		ctx.writer.writeUint8(Opcode.i32_rem_s);
		break;
		case PrimativeTypes.i64:
		ctx.writer.writeUint8(Opcode.i64_rem_s);
		break;
		default:
		compiler_error(node.source, `Invalid primative for ${node.type} ${node.value_type.name}`);
	}
}