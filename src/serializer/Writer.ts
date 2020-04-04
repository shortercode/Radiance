const PAGE_SIZE = 2048;

function transfer_arraybuffer (source: ArrayBuffer, new_length: number) {
    if (new_length <= source.byteLength)
        return source.slice(0, new_length);
    const sourceView = new Uint8Array(source);
    const destView = new Uint8Array(new ArrayBuffer(new_length));
    destView.set(sourceView);
    return destView.buffer;
}

function encode_string (str: string): Uint8Array {
		// TODO add support for unicode ( yes I know it should already... )
		const chars = [...str];
		const result = new Uint8Array(chars.length);

		for (let i = 0; i < chars.length; i++) {
			const code = chars[i].charCodeAt(0);
			if (code > 127)
				throw new Error("Unable to encode non-ascii characters");
			result[i] = code;
		}

    return result;
}

export class Writer {
    private buffer: ArrayBuffer = new ArrayBuffer(PAGE_SIZE)
    private data_view: DataView = new DataView(this.buffer)
    private size: number = PAGE_SIZE
    private page_count = 1
    private write_offset: number = 0

    getCurrentOffset (): number {
        return this.write_offset;
    }

    complete (): Uint8Array {
        // NOTE return only the bytes we have used! The buffer is expected
        // to be larger than the output
        return new Uint8Array(this.buffer, 0, this.write_offset);
    }

    writeUVint (value: number) {
				do {
					let byte = value & 0x7f;
					value >>>= 7;
					if (value !== 0) {
						byte |= 0x80;
					}
					this.writeUint8(byte);
				} while (value !== 0);
		}
		
		writeSignedUVint (value: number) {
			let more = true;
			while (more) {
				let byte = value & 0x7f;
				value >>>= 7;
				if ((value === 0 && (byte & 0x40) === 0) || (value === -1 && (byte & 0x40) !== 0)) {
					more = false;
				} else {
					byte |= 0x80;
				}
				this.writeUint8(byte);
			}
		}

    writeFixedSizeUVint (value: number): number {
				const position = this.write_offset;
				this.allocate(5);
				this.changeFixedSizeUVint(this.write_offset, value);
				this.write_offset += 5;
        return position;
    }
    
    changeFixedSizeUVint (offset: number, value: number) {
			for (let i = 0; i < 4; i++) {
				let byte = value & 0x7f;
				value >>>= 7;
				byte |= 0x80;
				this.data_view.setUint8(offset + i, byte);
			}
			let byte = value & 0x7f;
			this.data_view.setUint8(offset + 4, byte);
    }

    writeUint8 (value: number) {
        this.allocate(1);
        this.data_view.setUint8(this.write_offset, value);
        this.write_offset += 1;
    }

    writeUint32 (value: number) {
        this.allocate(4);
        this.data_view.setUint32(this.write_offset, value);
        this.write_offset += 4;
    }

    writeFloat32 (value: number) {
        this.allocate(4);
        this.data_view.setFloat32(this.write_offset, value);
        this.write_offset += 4;
    }

    writeFloat64 (value: number) {
        this.allocate(8);
        this.data_view.setFloat64(this.write_offset, value);
        this.write_offset += 8;
    }

    writeString (value: string) {
				const encoded_value = encode_string(value);
				this.writeUVint(encoded_value.length);
        this.writeBuffer(encoded_value);
    }

    writeBuffer (value: Uint8Array) {
        this.allocate(value.byteLength);
        const view = new Uint8Array(this.buffer);
        view.set(value, this.write_offset);
        this.write_offset += value.byteLength;
    }

    private allocate (count: number) {
        const new_space_required = (this.write_offset + count) - this.size;
        if (new_space_required > 0) {
            const required_new_page_count = Math.ceil(new_space_required / PAGE_SIZE);
            const standard_new_page_count = this.page_count;
            // NOTE the buffer is grown either by the required number of pages OR
            // the number of pages already in use ( doubling the buffer size )
            // whichever is larger
            this.grow(Math.max(required_new_page_count, standard_new_page_count));
        }
    }

    private grow (page_count: number) {
        const new_length = PAGE_SIZE * page_count  +  this.size;

        this.size = new_length;
        this.page_count += page_count;
        this.buffer = transfer_arraybuffer(this.buffer, new_length);
        this.data_view = new DataView(this.buffer);
    }
}