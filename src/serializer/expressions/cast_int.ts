import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTConvertToInt } from "../../WASTNode";
import { Opcode } from "../OpCode";
import { PrimativeTypes } from "../../compiler/LangType";

type WriteExpression = (ctx: FunctionContext, node: WASTExpressionNode) => void;

export function write_cast_int_expression (ctx: FunctionContext, node: WASTExpressionNode, write_expression: WriteExpression) {
	const cast_node = node as WASTConvertToInt;

	const target_type = cast_node.value_type.wasm_type();
	const source_type = cast_node.input.value_type.wasm_type();

	write_expression(ctx, cast_node.input);

	ctx.consume_any_value(cast_node.input.source);

	switch (target_type) {
		case PrimativeTypes.i32:
		convert_to_i32(source_type, ctx);
		break;
		case PrimativeTypes.i64:
		convert_to_i64(source_type, ctx);
		break;
		case PrimativeTypes.u32:
		convert_to_u32(source_type, ctx);
		break;
		case PrimativeTypes.u64:
		convert_to_u64(source_type, ctx);
		break;
	}

	ctx.push_value(target_type);
}

function convert_to_i32 (source_type: PrimativeTypes, ctx: FunctionContext) {
	switch (source_type) {
		case PrimativeTypes.u64:
		case PrimativeTypes.i64:
			ctx.writer.writeUVint(Opcode.i32_wrap_i64);
			break;
		case PrimativeTypes.f32:
			ctx.writer.writeUVint(Opcode.i32_trunc_f32_s);
			break;
		case PrimativeTypes.f64:
			ctx.writer.writeUVint(Opcode.i32_trunc_f64_s);
			break;
		case PrimativeTypes.u32:
			// nop
			break;
	}
}

function convert_to_i64 (source_type: PrimativeTypes, ctx: FunctionContext) {
	switch (source_type) {
		case PrimativeTypes.u32:
		case PrimativeTypes.i32:
			ctx.writer.writeUVint(Opcode.i64_extend_i32_s);
			break;
		case PrimativeTypes.u64:
			// nop
			break;
		case PrimativeTypes.f32:
			ctx.writer.writeUVint(Opcode.i64_trunc_f32_s);
			break;
		case PrimativeTypes.f64:
			ctx.writer.writeUVint(Opcode.i64_trunc_f64_s);
			break;
	}
}

function convert_to_u32 (source_type: PrimativeTypes, ctx: FunctionContext) {
	switch (source_type) {
		case PrimativeTypes.i32:
			// nop
			break;
		case PrimativeTypes.u64:
		case PrimativeTypes.i64:
			ctx.writer.writeUVint(Opcode.i32_wrap_i64);
			break;
		case PrimativeTypes.f32:
			ctx.writer.writeUVint(Opcode.i32_trunc_f32_u);
			break;
		case PrimativeTypes.f64:
			ctx.writer.writeUVint(Opcode.i32_trunc_f64_u);
			break;
	}
}

function convert_to_u64 (source_type: PrimativeTypes, ctx: FunctionContext) {
	switch (source_type) {
		case PrimativeTypes.u32:
		case PrimativeTypes.i32:
			ctx.writer.writeUVint(Opcode.i64_extend_i32_u);
			break;
		case PrimativeTypes.i64:
			// nop
			break;
		case PrimativeTypes.f32:
			ctx.writer.writeUVint(Opcode.i64_trunc_f32_u);
			break;
		case PrimativeTypes.f64:
			ctx.writer.writeUVint(Opcode.i64_trunc_f64_u);
			break;
	}
}