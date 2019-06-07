# @coxmediagroup/queue-js

JavaScript queue library

## Quick Start

### Install

```bash
npm install coxmediagroup/queue-js
```

### Example

```js
const { Queue } = require('@coxmediagroup/queue-js');

// Create a new Queue
const queue = new Queue();

// Listen for the "task" events and do something useful
queue.on('task', (task, taskEvent) => {
  if (taskEvent === 'success') {
    console.log(task.results);
  }
});

// Given there is a function to be run as an asynchronous task
function fn(input1, input2) {
  return `${input1} ${input2}`;
};

// Start a new task by putting a function and its parameters onto the queue
queue.put(fn, ['hello', 'world!'])); // console.log -> 'hello world!'
```
