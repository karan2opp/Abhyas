# Question Bank Reference Format
Only `topic` is required. `subject` is intentionally **not** stored — the bank is
topic-scoped and retrieval is a hybrid (semantic + BM25) search filtered by topic.
`type` is mcq|descriptive, `difficulty` is easy|medium|hard.
MCQ must have exactly 4 options with exactly one `- [x]`. Copy any block below into your topic file.

---
topic: Variables
type: descriptive
difficulty: medium
marks: 5
# subtopic optional
---
Explain the difference between `let` and `var` in JavaScript, using an example of block scoping.

---
topic: Functions
subtopic: Closures
type: descriptive
difficulty: hard
marks: 5
# subtopic shown as optional example
---
What is a closure in JavaScript? Show a practical example and explain when closures are useful.

---
topic: Variables
type: mcq
difficulty: easy
marks: 1
---
Which keyword declares a block-scoped variable in JavaScript?
- [ ] var
- [x] let
- [ ] function
- [ ] this

---
topic: Data Structures
type: mcq
difficulty: medium
marks: 1
---
Which data structure is mutable, ordered, and allows duplicate elements?
- [ ] Tuple
- [ ] Set
- [ ] Dictionary
- [x] List

---
topic: Functions
type: descriptive
difficulty: medium
marks: 5
---
Write a Python function that takes a list of numbers and returns the list containing only the even numbers, preserving order.

---
topic: Vouchers
type: mcq
difficulty: easy
marks: 1
---
Which key records a purchase voucher in Tally Prime by default?
- [ ] F4
- [ ] F6
- [x] F9
- [ ] F8