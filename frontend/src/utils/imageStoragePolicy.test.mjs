import test from 'node:test';
import assert from 'node:assert/strict';
import { isManagedCardImage } from './imageStoragePolicy.ts';

test('recognizes only ECard-managed images in the document directory', () => {
  const directory = 'file:///data/user/0/com.cardapp.ecard/files/';
  assert.equal(isManagedCardImage(`${directory}card_123_random.jpg`, directory), true);
  assert.equal(isManagedCardImage(`${directory}other.jpg`, directory), false);
  assert.equal(isManagedCardImage('file:///shared/card_123.jpg', directory), false);
  assert.equal(isManagedCardImage(`${directory}card_123.jpg`, null), false);
});
