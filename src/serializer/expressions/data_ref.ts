import { WASTExpressionNode, WASTConstNode, WASTDataRefNode } from "../../WASTNode";
import { FunctionContext } from "../FunctionContext";
import { Opcode } from "../OpCode";
import { PrimativeTypes } from "../../compiler/AtiumType";
import { compiler_error, compiler_assert, is_defined } from "../../compiler/error";

export function write_data_ref_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	
	const data_ref_node = node as WASTDataRefNode;
	const data_block_offset = ctx.data_lookup.get(data_ref_node.data_node)!;

	compiler_assert(is_defined(data_block_offset), node.source, `Unable to locate data block`);
	
	ctx.push_value(data_ref_node.value_type.wasm_type());

	switch (data_ref_node.value_type.wasm_type()) {
		case PrimativeTypes.str:
		ctx.writer.writeUint8(Opcode.i32_const);
		ctx.writer.writeUVint(data_block_offset);
		break;
		default:
		compiler_error(node.source, `Invalid primative for ${node.type} ${node.value_type.name}`);
	}
}