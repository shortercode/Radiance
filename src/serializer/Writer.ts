const PAGE_SIZE = 2048;

function transfer_arraybuffer (source, new_length) {
    if (new_length <= source.byteLength)
        return source.slice(0, new_length);
    const sourceView = new Uint8Array(source);
    const destView = new Uint8Array(new ArrayBuffer(new_length));
    destView.set(sourceView);
    return destView.buffer;
}

export class Writer {
    private buffer: ArrayBuffer = new ArrayBuffer(PAGE_SIZE)
    private data_view: DataView = new DataView(this.buffer)
    private size: number = PAGE_SIZE
    private page_count = 1
    private write_offset: number = 0

    getCurrentOffset (): number {

    }

    complete (): Uint8Array {
        // NOTE return only the bytes we have used! The buffer is expected
        // to be larger than the output
        return new Uint8Array(this.buffer, 0, this.write_offset);
    }

    writeUVint (value: number) {
        // TODO
    }

    writeFixedSizeUVint (value: number): number {
        // TODO
        // always uses 5 bytes
        // returns the offset
        return this.write_offset;
    }
    
    changeFixedSizeUVint (offset: number, value: number) {
        // TODO
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

    writeString () {
        // TODO
    }

    writeBuffer () {
        // TODO
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