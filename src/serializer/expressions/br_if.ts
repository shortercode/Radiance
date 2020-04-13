import { write_expression } from "./expression";
import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTConditionalBranchNode } from "../../WASTNode";
import { Opcode } from "../OpCode";
import { PrimativeTypes } from "../../compiler/AtiumType";

export function write_br_if_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	const br_if_node = node as WASTConditionalBranchNode;
	write_expression(ctx, br_if_node.condition);
	ctx.consume_value(PrimativeTypes.boolean);
	ctx.writer.writeUint8(Opcode.br_if);
	ctx.writer.writeUVint(br_if_node.index);
}