import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTLoadNode } from "../../WASTNode";
import { Opcode } from "../OpCode";
import { PrimativeTypes } from "../../compiler/LangType";
import { compiler_error } from "../../compiler/error";

type WriteExpression = (ctx: FunctionContext, node: WASTExpressionNode) => void;

export function write_load_expression(ctx: FunctionContext, node: WASTExpressionNode, write_expression: WriteExpression) {
	const load_node = node as WASTLoadNode;
	
	const location_expression = load_node.location;
	
	write_expression(ctx, location_expression);
	
	ctx.consume_value(PrimativeTypes.i32, node.source);
	
	const type = load_node.value_type.wasm_type();
	switch (type) {
		case PrimativeTypes.f32:
		ctx.writer.writeUint8(Opcode.f32_load);
		ctx.push_value(type);
		break;
		case PrimativeTypes.f64:
		ctx.writer.writeUint8(Opcode.f64_load);
		ctx.push_value(type);
		break;
		case PrimativeTypes.u32:
		case PrimativeTypes.i32:
		case PrimativeTypes.bool:
		case PrimativeTypes.str:
		ctx.writer.writeUint8(Opcode.i32_load);
		ctx.push_value(type);
		break;
		case PrimativeTypes.u64:
		case PrimativeTypes.i64:
		ctx.writer.writeUint8(Opcode.i64_load);
		ctx.push_value(type);
		break;
		default:
		compiler_error(node.source, `Unable to load unknown type`);
	}
	/*
		Offset is a fixed value that is added to the location expression
		Alignment is to do with usage of byte blocks... not really sure what the input value should be yet
	*/
	const offset = load_node.offset;
	const alignment = 0;// ?

	ctx.writer.writeUVint(alignment)
	ctx.writer.writeUVint(offset);
}