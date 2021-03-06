import { Writer } from "./Writer";
import { LangType, PrimativeTypes } from "../compiler/LangType";
import { Ref } from "../WASTNode";
import { compiler_error } from "../compiler/error";

export function write_value_type (writer: Writer, type: LangType) {
	switch (type.wasm_type()) {
		case PrimativeTypes.bool:
		case PrimativeTypes.u32:
		case PrimativeTypes.i32:
		case PrimativeTypes.str:
		writer.writeUint8(0x7F);
		break;
		case PrimativeTypes.u64:
		case PrimativeTypes.i64:
		writer.writeUint8(0x7E);
		break;
		case PrimativeTypes.f32:
		writer.writeUint8(0x7D);
		break;
		case PrimativeTypes.f64:
		writer.writeUint8(0x7C);
		break;
		case PrimativeTypes.never:
		case PrimativeTypes.void:
		writer.writeUint8(0x40);
		break;
		default:
		compiler_error(Ref.unknown(), `Invalid value for type ${type.name}`);
	}
}