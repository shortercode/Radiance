/*
    Used by the lexer to buffer the input.
    Text is stored in a static memory block, which is grown when requires
*/
const { TextDecoder } = require("util");

export default class CharBuffer {
    private buffer: Uint16Array
    private size: number
    private page_size: number
    private index: number = 0
    private decoder: TextDecoder
    private views: {
        single: Uint16Array,
        double: Uint16Array,
        triple: Uint16Array,
    }

    constructor(page_size: number = 2048) {
        this.buffer = new Uint16Array(page_size);
        this.size = page_size;
        this.page_size = page_size
        this.decoder = new TextDecoder("utf-16");

        // short length
        this.views = {
            single: this.buffer.subarray(0, 1),
            double: this.buffer.subarray(0, 2),
            triple: this.buffer.subarray(0, 3)
        };
    }
    private reserve(size: number) {
        const total = this.index + size;
        while (this.size <= total)
            this.grow_buffer();
    }
    private grow_buffer() {
        // increase recorded buffer size
        this.size += this.page_size;
        // create replacement
        const replacement = new Uint16Array(this.size);
        // copy old buffer into replacement
        replacement.set(this.buffer);
        // switch the buffers
        this.buffer = replacement;
    }
    push(str: string) {
        const size = str.length;

        // if we need more space, increase the buffer size
        this.reserve(size);

        const pos = this.index;

        // copy the character codes to the buffer
        // don't use codePointAt here, we want char codes not code points
        for (let i = 0; i < size; i++)
            this.buffer[pos + i] = str.charCodeAt(i);

        // increase the index position
        this.index += size;
    }
    back (l: number) {
        this.index -= l;
    }
    get_index (): number {
        return this.index;
    }
    splice(target: number, text: string) {
        if (target > this.index)
            throw new Error("Unable to splice text ahead of the write head");
        const size = text.length;
        this.reserve(size);
        this.buffer.copyWithin(target + size, target, this.index);
        for (let i = 0; i < size; i++)
            this.buffer[target + i] = text.charCodeAt(i);
        this.index += size;
        return size;
    }
    consume(): string {
        if (this.index == 0)
            return "";

        let subview;

        switch (this.index) {
            case 1:
                subview = this.views.single;
                break;
            case 2:
                subview = this.views.double;
                break;
            case 3:
                subview = this.views.triple;
                break;
            default:
                subview = this.buffer.slice(0, this.index);
                break;
        }

        this.index = 0;
        return this.decoder.decode(subview);
    }
}
