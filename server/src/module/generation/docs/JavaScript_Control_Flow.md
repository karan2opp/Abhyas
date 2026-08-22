# JavaScript Control Flow Statements

In this blog, we are going to learn about **control flow statements in
JavaScript**.

Control flow refers to controlling the flow of program execution. By
default, a JavaScript program executes statements from top to bottom,
line by line.

But in real programs, we often need to make decisions. For example:

-   If a user is above 18, allow them to vote.
-   If a user has a valid coupon, apply a discount.
-   If a coffee cup is medium-sized, charge ₹100.
-   If a membership is Gold during a festival, give a 30% discount.

For these situations, we use **control flow statements**.

We will learn:

-   `if`
-   `if-else`
-   `else-if` ladder
-   `switch`

------------------------------------------------------------------------

# 1. `if` Statement

The `if` statement is used when we want to execute a block of code only
when a condition is `true`.

## Syntax

``` javascript
if (condition) {
    // body
}
```

If the condition is `true`, the code inside the `if` block executes. If
it is `false`, the block is skipped.

## Example: Voting Eligibility

``` javascript
const age = 19;

if (age >= 18) {
    console.log("You can vote");
}
```

### Output

``` text
You can vote
```

Here, `age >= 18` is `true`, so the code inside the `if` block executes.

## Real-World Example: Coupon Discount

Suppose you run a clothing brand and give customers a **10% discount**
if they have a valid coupon code.

``` javascript
let bill = 2000;
let couponCode = "SAVE10";

if (couponCode === "SAVE10") {
    bill = bill - bill * 0.10;
}

console.log(bill);
```

### Output

``` text
1800
```

The coupon matches, so the discount is applied.

If the customer does not have the coupon:

``` javascript
let bill = 2000;
let couponCode = "";

if (couponCode === "SAVE10") {
    bill = bill - bill * 0.10;
}

console.log(bill);
```

### Output

``` text
2000
```

The empty string does not match `"SAVE10"`, so the discount is not
applied.

------------------------------------------------------------------------

# 2. `if-else` Statement

`if-else` is used to **make a decision between two possibilities**.

-   If the condition is true → execute the `if` block.
-   Otherwise → execute the `else` block.

## Syntax

``` javascript
if (condition) {
    // code when condition is true
} else {
    // code when condition is false
}
```

## Example: Voting Eligibility

``` javascript
const age = 17;

if (age >= 18) {
    console.log("You can vote");
} else {
    console.log("You cannot vote");
}
```

### Output

``` text
You cannot vote
```

Here, `age >= 18` is false, so JavaScript executes the `else` block.

------------------------------------------------------------------------

# 3. `else-if` Ladder

The `else-if` ladder is used when we have **multiple conditions** and
want to execute different blocks depending on which condition is true.

## Syntax

``` javascript
if (condition1) {
    // code
} else if (condition2) {
    // code
} else if (condition3) {
    // code
} else {
    // code when none are true
}
```

JavaScript checks conditions from top to bottom. As soon as it finds a
true condition, that block executes and the remaining conditions are
skipped.

## Example: Comparing Two Numbers

``` javascript
let a = 5;
let b = 6;

if (a > b) {
    console.log("a is greater than b");
} else if (a < b) {
    console.log("a is less than b");
} else {
    console.log("a is equal to b");
}
```

### Output

``` text
a is less than b
```

## Real-World Example: Coffee Shop

Suppose a cafe sells coffee in three sizes:

-   Small → ₹50
-   Medium → ₹100
-   Large → ₹150

``` javascript
let price;
let cupSize = "medium";

if (cupSize === "small") {
    price = 50;
} else if (cupSize === "medium") {
    price = 100;
} else if (cupSize === "large") {
    price = 150;
} else {
    console.log("Invalid cup size");
}

console.log("The final price for your cup of coffee is", price);
```

### Output

``` text
The final price for your cup of coffee is 100
```

------------------------------------------------------------------------

# 4. `switch` Statement

The `switch` statement is commonly used as an alternative to a long
`if-else-if` ladder when comparing **one value against multiple fixed
values**.

## Syntax

``` javascript
switch (expression) {
    case value1:
        // code
        break;

    case value2:
        // code
        break;

    default:
        // code when no case matches
}
```

## Explanation

-   **`expression`** → the value you want to check.
-   **`case`** → a possible matching value.
-   **`break`** → stops execution after a matching case.
-   **`default`** → runs when no case matches.

## Example: Days of the Week

``` javascript
let day = 2;

switch (day) {
    case 1:
        console.log("Sunday");
        break;

    case 2:
        console.log("Monday");
        break;

    case 3:
        console.log("Tuesday");
        break;

    case 4:
        console.log("Wednesday");
        break;

    case 5:
        console.log("Thursday");
        break;

    case 6:
        console.log("Friday");
        break;

    case 7:
        console.log("Saturday");
        break;

    default:
        console.log("Invalid day");
}
```

### Output

``` text
Monday
```

The `switch` compares `day` with each case. Since `day` is `2`, `case 2`
matches and `"Monday"` is printed.

------------------------------------------------------------------------

# Why Do We Use `break`?

`break` stops execution of the `switch`.

``` javascript
let day = 2;

switch (day) {
    case 1:
        console.log("Sunday");
        break;

    case 2:
        console.log("Monday");
        break;

    case 3:
        console.log("Tuesday");
        break;
}
```

Once `case 2` matches, `"Monday"` is printed and the `switch` exits.

Without `break`, JavaScript can continue executing following cases. This
is called **fall-through**.

------------------------------------------------------------------------

# When to Use `switch` and When to Use `if-else`?

A simple rule is:

### Use `switch`

When you are comparing **one expression/value against multiple fixed
values**.

``` javascript
let role = "admin";

switch (role) {
    case "admin":
        console.log("Full access");
        break;

    case "user":
        console.log("Limited access");
        break;

    default:
        console.log("Unknown role");
}
```

### Use `if-else`

When your conditions involve:

-   Comparisons such as `>`, `<`, `>=`, `<=`
-   Multiple variables
-   Logical operators such as `&&` and `||`
-   More complex conditions

Example:

``` javascript
if (age >= 18 && isLoggedIn) {
    console.log("Access granted");
}
```

This type of condition is generally clearer with `if-else`.

------------------------------------------------------------------------

# Real-World Example: Gym Membership Discount

Suppose you run a gym with different membership plans.

During a festival:

-   Gold members get 30% discount.
-   Silver members get 20% discount.
-   Gold members outside the festival get 10% discount.
-   Everyone else gets no discount.

## Using `if-else`

``` javascript
let membershipType = "Gold";
let isFestival = true;

if (membershipType === "Gold" && isFestival === true) {
    console.log("30% Discount");
} else if (membershipType === "Silver" && isFestival === true) {
    console.log("20% Discount");
} else if (membershipType === "Gold") {
    console.log("10% Discount");
} else {
    console.log("No Discount");
}
```

### Output

``` text
30% Discount
```

The `if-else` version is easy to understand because the conditions
involve both `membershipType` and `isFestival`, along with the logical
`&&` operator.

------------------------------------------------------------------------

# Using `switch`

JavaScript can also use `switch` with `true` as the expression:

``` javascript
let membershipType = "Gold";
let isFestival = true;

switch (true) {
    case membershipType === "Gold" && isFestival === true:
        console.log("30% Discount");
        break;

    case membershipType === "Silver" && isFestival === true:
        console.log("20% Discount");
        break;

    case membershipType === "Gold":
        console.log("10% Discount");
        break;

    default:
        console.log("No Discount");
}
```

### Output

``` text
30% Discount
```

This works, but in this example the `if-else` version is easier to read.

The `switch (true)` pattern is valid JavaScript, but it is usually
better to use normal `if-else` when the conditions are complex.

------------------------------------------------------------------------

# Quick Comparison

  Statement   Best Used For
  ----------- ----------------------------------------------
  `if`        Execute code only when one condition is true
  `if-else`   Choose between two possibilities
  `else-if`   Choose between multiple conditions
  `switch`    Compare one value with multiple fixed values

------------------------------------------------------------------------

# Important Points to Remember

-   `if` executes code only when its condition is `true`.
-   `if-else` provides two possible execution paths.
-   `else-if` allows us to check multiple conditions.
-   `switch` is useful when comparing one value with multiple fixed
    values.
-   `break` normally stops a matching `switch` case from continuing into
    the next case.
-   `default` executes when no `switch` case matches.
-   `if-else` is generally easier to read for complex logical
    conditions.
-   `switch` is generally cleaner for many fixed-value comparisons.
-   Conditions can use comparison operators such as `===`, `!==`, `>`,
    `<`, `>=`, and `<=`.
-   Conditions can also use logical operators such as `&&`, `||`, and
    `!`.

------------------------------------------------------------------------

# Conclusion

In this topic, we learned how **control flow statements** help us
control the execution of a JavaScript program instead of simply running
every statement from top to bottom.

We explored:

-   `if`
-   `if-else`
-   `else-if` ladder
-   `switch`

We used practical examples involving voting eligibility, coupon
discounts, coffee pricing, days of the week, and gym memberships to
understand how decisions are made in real programs.

We learned that:

-   **`if`** is used when we want to execute code only if a condition is
    true.
-   **`if-else`** helps us choose between two possibilities.
-   **`else-if`** is useful when we have multiple conditions to check.
-   **`switch`** is best when comparing one value against multiple fixed
    values.

Most importantly, we learned when to choose between `if-else` and
`switch`.

If your logic involves multiple variables or logical operators such as
`&&` and `||`, `if-else` is usually clearer and easier to understand. If
you are comparing a single value with different fixed values, `switch`
can make the code cleaner and more organized.

Understanding control flow is a fundamental step in programming because
it allows us to build real decision-making systems in our applications.

Now that you know how to control program flow, you are ready to write
smarter and more dynamic JavaScript programs.
