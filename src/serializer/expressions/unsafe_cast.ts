import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTUnsafeCast, Ref } from "../../WASTNode";
import { Opcode } from "../OpCode";
import { PrimativeTypes, LangType } from "../../compiler/LangType";
import { compiler_error } from "../../compiler/error";

type WriteExpression = (ctx: FunctionContext, node: WASTExpressionNode) => void;

export function write_unsafe_cast_expression (ctx: FunctionContext, node: WASTExpressionNode, write_expression: WriteExpression) {
	const cast_node = node as WASTUnsafeCast;
	const source_type = cast_node.input.value_type;

	write_expression(ctx, cast_node.input);

	const output_type = cast_node.value_type.wasm_type();
	switch (output_type) {
		case PrimativeTypes.i32:
		case PrimativeTypes.u32:
		convert_to_i32(node.source, source_type, ctx, output_type);
		break;
		case PrimativeTypes.i64:
		case PrimativeTypes.u64:
		convert_to_i64(node.source, source_type, ctx, output_type);
		break;
		default:
		compiler_error(node.source, "Expected integer output type");
		break;
	}
}

function convert_to_i32 (ref: Ref, source_type: LangType, ctx: FunctionContext, output_type: PrimativeTypes.i32 | PrimativeTypes.u32) {
	ctx.consume_any_value(ref)
	switch (source_type.wasm_type()) {
		case PrimativeTypes.u64:
		case PrimativeTypes.i64:
		ctx.writer.writeUVint(Opcode.i32_wrap_i64);
		break;
		case PrimativeTypes.i32:
		case PrimativeTypes.u32:
		// nop
		break;
		default:
		compiler_error(ref, "Expected integer source type");
		break;
	}
	ctx.push_value(output_type);
}

function convert_to_i64 (ref: Ref, source_type: LangType, ctx: FunctionContext, output_type: PrimativeTypes.i64 | PrimativeTypes.u64) {
	ctx.consume_any_value(ref)
	switch (source_type.wasm_type()) {
		case PrimativeTypes.u64:
		case PrimativeTypes.i64:
		// nop
		break;
		case PrimativeTypes.i32:
		case PrimativeTypes.u32:
		ctx.writer.writeUVint(Opcode.i64_extend_i32_s);
		break;
		compiler_error(ref, "Expected integer source type");
		break;
	}
	ctx.push_value(output_type);
}