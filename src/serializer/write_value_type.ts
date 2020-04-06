import { Writer } from "./Writer";
import { AtiumType } from "../compiler/AtiumType";

export function write_value_type (writer: Writer, type: AtiumType) {
	switch (type) {
			case "boolean":
			case "i32":
					writer.writeUint8(0x7F);
					break;
			case "i64":
					writer.writeUint8(0x7E);
					break;
			case "f32":
					writer.writeUint8(0x7D);
					break;
			case "f64":
					writer.writeUint8(0x7C);
					break;
			case "void":
					writer.writeUint8(0x40);
					break;
			default:
					throw new Error("Invalid value type");
	}
}