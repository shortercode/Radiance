import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTSetGlobalNode } from "../../WASTNode";
import { Opcode } from "../OpCode";
import { compiler_assert } from "../../compiler/error";
import { write_expression } from "./expression";

export function write_set_global_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	const set_global_node = node as WASTSetGlobalNode;
	const global_id = ctx.global_lookup.get(set_global_node.id);
	
	compiler_assert(typeof global_id === "number", node.source, `Cannot find global ${set_global_node.name}`);
	
	const subnode = set_global_node.value;
	write_expression(ctx, subnode);

	ctx.consume_value(set_global_node.value_type.wasm_type());
	
	ctx.writer.writeUint8(Opcode.global_set);
	ctx.writer.writeUVint(global_id!);
}