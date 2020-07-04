import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, WASTDataRefNode, Ref } from "../../WASTNode";
import { encode_string } from "../../encode_string";
import { STR_TYPE } from "../LangType";

/*
	Strings are basically an array of bytes. All arrays are prepended
	with a uint32 of the length of the following array ( even if the array is empty )
*/
function encode_byte_array (bytes: Uint8Array) {
	const length = bytes.byteLength;
	const buffer = new ArrayBuffer(length + 4);
	const buffer_u8_view = new Uint8Array(buffer);
	const data_view = new DataView(buffer);
	data_view.setUint32(0, length, true);
	buffer_u8_view.set(bytes, 4);

	return buffer_u8_view;
}

export function visit_string_expression (compiler: Compiler, node: AST, _type_hint: TypeHint): WASTExpressionNode {
	const ref = Ref.from_node(node);
	const data = node.data as string;
	const str = encode_string(data);
	const byte_array = encode_byte_array(str);
	const data_block = compiler.ctx.define_data(ref, byte_array);

	/* TODO we need a psuedo type for a codepoint (u32) so that users can pass
	around codepoints instead of bytes for certain uses. This doesn't resolve
	the grapheme cluster problem ( the so called "user percieved character" which
	can be many codepoints ) but that should be dealt with the standard lib,
	not the language symantics.

	The reason why this TODO appears here is that if we have a single codepoint
	string and the type hint is "codepoint" then it should return a "codepoint"
	not a string.
	*/

	return new WASTDataRefNode(ref, STR_TYPE, data_block);
}