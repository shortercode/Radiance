import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTGetLocalNode } from "../../WASTNode";
import { Opcode } from "../OpCode";
import { compiler_assert } from "../../compiler/error";

export function write_get_local_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	const get_local_node = node as WASTGetLocalNode;
	const local_id = ctx.variable_lookup.get(get_local_node.id);
	
	compiler_assert(typeof local_id === "number", node.source, `Cannot find local ${get_local_node.name}`);
	
	ctx.push_value(get_local_node.value_type.wasm_type());
	
	ctx.writer.writeUint8(Opcode.local_get);
	ctx.writer.writeUVint(local_id!);
}