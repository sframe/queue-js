# Queue

JavaScript queue library

## Quick Start

```bash
  npm install coxmediagroup/queue
```

```js
const { Queue } = require('@coxmediagroup/queue');

// Given there is a task to be done
const fn = (input1, input2) => `${input1} ${input2}`;

// Create a new Queue
const queue = new Queue();

// Define a new task by putting the function, and any parameters of it,
// onto the queue and storing a reference of the new queue item
const queueItem = queue.put(fn, ['hello', 'world!']));

// Listen for the "complete" event of the queue item containing the given task
// and then access the results of the function that was executed
queueItem.once('complete', (task) => {
  console.log(task.results); // 'hello world!'
});
```
