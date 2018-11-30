import { QueueItem } from './queue-item';

describe('Queue-Item', () => {
  it('should instantiate as a queue-item instance with default properties.', () => {
    const fn = (): undefined => undefined;
    const queueItem = new QueueItem(fn, []);
    const expected = {
      results: null,
      status: 'Pending',
    };
    expect(queueItem).toMatchObject(expected);
  });

  it('should update its own properties when the run method is called.', async () => {
    const fn = (p1: string, p2: string): string => `${p1} ${p2}`;
    const queueItem = new QueueItem(fn, ['hello', 'world']);
    const expected = {
      results: 'hello world',
      status: 'Success',
    };
    await queueItem.run();
    expect(queueItem).toMatchObject(expected);
  });

  it('should update its own properties when an exception is thrown.', () => {
    const fn = (): void => {
      throw new Error('Never works!');
    };

    const queueItem = new QueueItem(fn, []);
    const expected = {
      results: null,
      status: 'Failed',
    };

    queueItem.run();
    expect(queueItem).toMatchObject(expected);
  });
});
