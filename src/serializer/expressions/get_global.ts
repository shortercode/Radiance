import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTSetGlobalNode, WASTGetGlobalNode } from "../../WASTNode";
import { Opcode } from "../OpCode";
import { compiler_assert } from "../../compiler/error";

export function write_get_global_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	const get_global_node = node as WASTGetGlobalNode;
	const global_id = ctx.global_lookup.get(get_global_node.id);
	
	compiler_assert(typeof global_id === "number", node.source, `Cannot find global ${get_global_node.name}`);

	ctx.push_value(get_global_node.value_type.wasm_type());
	
	ctx.writer.writeUint8(Opcode.global_get);
	ctx.writer.writeUVint(global_id!);
}