# Mark and Sweep Garbage Collection system for Radiance

The existing malloc function needs to be modified to prepend the memory block with a GC header. This header contains a pointer to the next block, a flag indicating if it is "free" and the size of the block.

let start: i32 = 0

struct Header {
	is_free: bool
	size: u32
	next: Header
}

fn malloc (size: u32) -> u32 {
	let header = find_free(size)

	header.is_free = false
	// block is much larger, split it
	if header.size - size >= 16 {
		let next = unsafe { header as u32 } + 12
		next.next = header.next
		next.is_free = true
		next.size = header.size - (size + 12)
		header.next = next
		header.size = size 
	}
	return unsafe { header as u32 } + 12
}

fn free (ptr: u32) {
	let header = unsafe { (ptr - 12) as Header }
	let next = header.next
	header.is_free = true
	// join with next block
	if next.is_free { 
		header.next = next.next
		header.size = header.size + next.size + 12
	}
}

fn find_free (size: u32): Header {
	let current: Header = unsafe { start as Header }

	loop {
		if current.is_free and current.size >= size {
			return current
		}
		if current.next {
			current = current.next
		}
		else {
			break
		}
	}

	if (current.is_free) {
		grow((size - current.size) >> 16)

		current.size = current.size + PAGE_SIZE
		return current
	}
	else {
		grow(size >> 16)

		let next = unsafe { (current as u32 + current.size + 12) as Header }
		next.is_free = true
		next.next = null
		next.size = PAGE_SIZE - 12
		current.next = next
		return next
	}
}