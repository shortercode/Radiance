import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTBranchNode } from "../../WASTNode";
import { Opcode } from "../OpCode";

export function write_br_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	const br_node = node as WASTBranchNode;
	ctx.writer.writeUint8(Opcode.br);
	ctx.writer.writeUVint(br_node.index);
}