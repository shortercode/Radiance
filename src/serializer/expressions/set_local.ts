import { write_expression } from "./expression";
import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTSetLocalNode } from "../../WASTNode";
import { Opcode } from "../OpCode";
import { compiler_assert } from "../../compiler/error";

export function write_set_local_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	const set_local_node = node as WASTSetLocalNode;
	const local_id = ctx.variable_lookup.get(set_local_node.id);
	
	compiler_assert(typeof local_id === "number", node.source, `Cannot find local ${set_local_node.name}`);
	
	const subnode = set_local_node.value;
	write_expression(ctx, subnode);
	
	ctx.consume_value(subnode.value_type.wasm_type(), node.source);
	
	ctx.writer.writeUint8(Opcode.local_set);
	ctx.writer.writeUVint(local_id!);
}