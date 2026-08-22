# JavaScript Arrays

By using control flow statements, we can make our code more dynamic,
decision-based, and efficient. Now, building on that foundation, let's
move forward to another important concept in JavaScript: **arrays**.

------------------------------------------------------------------------

# What is an Array?

Suppose you want to store the names of 10 students.

You could create 10 different variables:

``` javascript
let student1 = "Aman";
let student2 = "Riya";
let student3 = "Rahul";
// ...
```

That's okay for 10 students, but what if you have **100 students**?

Would you create 100 variables?

That would quickly become difficult to write, manage, and maintain.

This is where **arrays** come into the picture.

An **array is an ordered collection of values**. It allows us to store
multiple values under a single variable name.

You can think of an array as a **list** that stores multiple items in a
particular order.

For example:

``` javascript
let fruits = ["apple", "mango", "banana", "litchi", "orange"];
```

Here, the variable `fruits` stores five different fruit names.

------------------------------------------------------------------------

# Creating an Array

We create an array using square brackets `[]`.

``` javascript
let fruits = ["apple", "mango", "banana", "litchi", "orange"];
```

The individual values inside an array are called **elements**.

Each element is separated by a comma:

``` javascript
let fruits = ["apple", "mango", "banana", "litchi", "orange"];
```

Here:

-   `"apple"` is an element.
-   `"mango"` is an element.
-   `"banana"` is an element.
-   `"litchi"` is an element.
-   `"orange"` is an element.

------------------------------------------------------------------------

# Arrays Are Zero-Indexed

JavaScript arrays are **zero-indexed**.

This means the first element starts at index `0`, not `1`.

For example:

``` javascript
let fruits = ["apple", "mango", "banana", "litchi", "orange"];
```

The indexes look like this:

    Index Value
  ------- ------------
      `0` `"apple"`
      `1` `"mango"`
      `2` `"banana"`
      `3` `"litchi"`
      `4` `"orange"`

So the first element is at index `0`, the second element is at index
`1`, and so on.

------------------------------------------------------------------------

# Accessing Array Elements

We can access an element using its index.

The syntax is:

``` javascript
arrayName[index];
```

For example:

``` javascript
let fruits = ["apple", "mango", "banana", "litchi", "orange"];

console.log(fruits[1]);
```

### Output

``` text
mango
```

Here:

``` javascript
fruits[1]
```

means:

> Give me the element from the `fruits` array at index `1`.

------------------------------------------------------------------------

## Accessing Multiple Elements

``` javascript
let fruits = ["apple", "mango", "banana", "litchi", "orange"];

console.log(fruits[0]);
console.log(fruits[3]);
```

### Output

``` text
apple
litchi
```

Remember that indexes start from `0`.

------------------------------------------------------------------------

# What Happens If the Index Doesn't Exist?

If we try to access an index that doesn't exist, JavaScript returns
`undefined`.

``` javascript
let fruits = ["apple", "mango", "banana"];

console.log(fruits[10]);
```

### Output

``` text
undefined
```

There is no element at index `10`, so JavaScript gives us `undefined`.

------------------------------------------------------------------------

# Arrays Can Store Different Types of Values

JavaScript arrays are flexible. They can contain values of different
data types.

For example:

``` javascript
let values = ["apple", 7, true, null];
```

This is a valid JavaScript array.

However, just because JavaScript allows different types does not mean
that mixing unrelated values is always a good design choice.

For example:

``` javascript
let fruits = ["apple", "mango", "banana", 7];
```

This is valid JavaScript, but storing the number `7` inside an array
called `fruits` probably does not make much sense.

In most programs, it is better to keep an array's elements logically
related.

------------------------------------------------------------------------

# Finding the Length of an Array

Now suppose you want to access the **last element** of an array.

What if you don't know how many elements the array contains?

JavaScript provides the `length` property.

``` javascript
let fruits = ["apple", "mango", "banana", "litchi", "orange"];

console.log(fruits.length);
```

### Output

``` text
5
```

The `length` property tells us how many elements are present in the
array.

------------------------------------------------------------------------

# Accessing the Last Element

Arrays are zero-indexed.

If an array has `5` elements:

``` text
length = 5
```

the indexes are:

``` text
0, 1, 2, 3, 4
```

Therefore:

``` text
last index = length - 1
```

So we can access the last element like this:

``` javascript
let fruits = ["apple", "mango", "banana", "litchi", "orange"];

let lastIndex = fruits.length - 1;

console.log(fruits[lastIndex]);
```

### Output

``` text
orange
```

There is also a shorter way:

``` javascript
console.log(fruits[fruits.length - 1]);
```

### Output

``` text
orange
```

This is a very common pattern in JavaScript.

------------------------------------------------------------------------

# Updating an Array Element

We can also change the value stored at a particular index.

For example:

``` javascript
let fruits = ["apple", "mango", "banana", "litchi", "orange"];

fruits[1] = "watermelon";

console.log(fruits[1]);
```

### Output

``` text
watermelon
```

Originally:

``` text
index 1 → mango
```

After updating:

``` text
index 1 → watermelon
```

The same square-bracket notation is used for both **accessing** and
**updating** elements.

------------------------------------------------------------------------

# Arrays Are Mutable

Arrays are objects in JavaScript and their contents can be modified.

For example:

``` javascript
let fruits = ["apple", "mango", "banana"];

fruits[0] = "orange";

console.log(fruits);
```

### Output

``` text
["orange", "mango", "banana"]
```

The array itself was modified.

------------------------------------------------------------------------

# Looping Over Arrays

Suppose you have an array containing the marks of students:

``` javascript
let marks = [55, 56, 73, 45, 88, 43, 66, 64, 78];
```

Every student receives **5 grace marks**.

How can we add 5 marks to every element?

We could manually update every index:

``` javascript
marks[0] = marks[0] + 5;
marks[1] = marks[1] + 5;
marks[2] = marks[2] + 5;
// ...
```

But this becomes difficult when the array contains hundreds or thousands
of elements.

This is where **loops** are useful.

We can loop through the indexes of the array and update every value.

------------------------------------------------------------------------

# Using a `for` Loop

``` javascript
let marks = [55, 56, 73, 45, 88, 43, 66, 64, 78];

for (let i = 0; i < marks.length; i++) {
    marks[i] = marks[i] + 5;
}
```

Let's understand what happens.

Initially:

``` text
[55, 56, 73, 45, 88, 43, 66, 64, 78]
```

The loop starts with:

``` text
i = 0
```

So:

``` javascript
marks[0] = marks[0] + 5;
```

becomes:

``` text
55 + 5 = 60
```

Then `i` becomes `1`:

``` text
56 + 5 = 61
```

The loop continues until every element has been updated.

------------------------------------------------------------------------

# Printing All Array Elements Using a Loop

We can also use a loop to print every value.

``` javascript
let marks = [55, 56, 73, 45, 88, 43, 66, 64, 78];

for (let i = 0; i < marks.length; i++) {
    marks[i] = marks[i] + 5;
}

for (let i = 0; i < marks.length; i++) {
    console.log(marks[i]);
}
```

### Output

``` text
60
61
78
50
93
48
71
69
83
```

Notice that we use:

``` javascript
let i
```

inside the `for` loop. `int` is not a JavaScript keyword.

------------------------------------------------------------------------

# Understanding the Array Loop

Consider:

``` javascript
for (let i = 0; i < marks.length; i++) {
    console.log(marks[i]);
}
```

The loop has three important parts:

### 1. Initialization

``` javascript
let i = 0;
```

We start from index `0`.

### 2. Condition

``` javascript
i < marks.length;
```

The loop continues while `i` is a valid index.

### 3. Update

``` javascript
i++;
```

After every iteration, `i` increases by `1`.

Inside the loop:

``` javascript
marks[i]
```

gives us the current element.

------------------------------------------------------------------------

# A Simple Mental Model

You can imagine an array like a row of boxes:

``` text
       0          1          2          3          4
   +--------+  +--------+  +--------+  +--------+  +--------+
   | apple  |  | mango  |  | banana |  | litchi |  | orange |
   +--------+  +--------+  +--------+  +--------+  +--------+
```

The number above each box is the **index**.

If you want `"banana"`:

``` javascript
fruits[2]
```

If you want `"orange"`:

``` javascript
fruits[4]
```

If you want to change `"mango"`:

``` javascript
fruits[1] = "watermelon";
```

This mental model makes array indexing much easier to understand.

------------------------------------------------------------------------

# Quick Revision

  Concept          Example                             Meaning
  ---------------- ----------------------------------- -----------------------
  Create array     `let fruits = ["apple", "mango"]`   Creates an array
  Access element   `fruits[0]`                         Gets first element
  Update element   `fruits[1] = "orange"`              Changes an element
  Array length     `fruits.length`                     Number of elements
  Last index       `fruits.length - 1`                 Index of last element
  Last element     `fruits[fruits.length - 1]`         Gets last element
  Loop             `for (...)`                         Repeats an operation

------------------------------------------------------------------------

# Important Points to Remember

-   An **array** is an ordered collection of values.
-   Arrays allow us to store multiple values under one variable name.
-   Arrays are created using square brackets `[]`.
-   Array indexes start from `0`.
-   The first element is at index `0`.
-   The last index is `array.length - 1`.
-   The `length` property gives the number of elements.
-   We use `array[index]` to access an element.
-   We can use `array[index] = value` to update an element.
-   Arrays can contain values of different types.
-   Arrays are mutable, so their elements can be changed.
-   Loops are useful for processing large arrays efficiently.
-   `for` loops can be used to iterate through array indexes.

------------------------------------------------------------------------

# Conclusion

In this blog, we learned what **arrays** are and why they are useful for
storing multiple values under a single variable name.

We explored how to:

-   Create arrays.
-   Store multiple elements.
-   Access elements using indexes.
-   Understand zero-based indexing.
-   Find the number of elements using the `length` property.
-   Access the last element using `length - 1`.
-   Update values at specific indexes.
-   Loop through arrays using a `for` loop.
-   Perform operations on every element of an array.

Arrays make our code more organized, flexible, and efficient when
working with a collection of data.

Now that you understand the basics of arrays, you are ready to learn
more powerful array operations such as **adding and removing elements,
searching, transforming, filtering, and iterating with methods like
`push()`, `pop()`, `map()`, `filter()`, and `forEach()`**.
