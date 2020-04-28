# Design Notes - Type Inference Prepass

While the existing type inference system works it has several deficiencies. Most notibly being that it can end up repeating work mutiple times. During compilation the inference system is spun up in 2 situations. Firstly when visiting a variable declaration that has no type description and secondly in a binary expression that has no type hint. Under simple circumstances these situations have little cost, normally the inference system visits a single subnode and returns a type. 

#### Simple type inference
```
	let a = 1 // a inferred as default int type i32
	let b = 1.2 + 3 // 
```

However, under complex situations such as where the subnode is a block the inference system will have to visit every subnode in the block, possibly having to infer the type of other variables.

#### Complex type inference
```
	let a = {
		let b = (12, 1.6)
		let c = (15, 20)
		(b.0 + c.0, b.1 + c.1)
	}
```

While this isn't wasted work when the compiler later visits the subnodes of the block it will trigger the inference system again, but all the information from the last visit will have been lost.