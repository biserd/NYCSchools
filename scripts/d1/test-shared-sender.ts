import assert from 'node:assert/strict';
import { classifySharedMessage, dispatchVerifiedSharedMessage, type SharedSenderHandlers } from '../../server/parent/shared-sender';

assert.deepEqual(classifySharedMessage('SCHOOL LINK abc'), { kind: 'school', text: 'LINK abc' });
assert.deepEqual(classifySharedMessage(' school: remind me\ntomorrow '), { kind: 'school', text: 'remind me\ntomorrow' });
assert.deepEqual(classifySharedMessage('SCHOOL'), { kind: 'school', text: '' });
assert.deepEqual(classifySharedMessage('schoolhouse run'), { kind: 'running' });
assert.deepEqual(classifySharedMessage('LINK abc'), { kind: 'running' }, 'Existing running links stay unchanged');
assert.deepEqual(classifySharedMessage('SCHOOL hello', 'STOP'), { kind: 'stop-all' });
for (const word of ['STOP', 'stopall', ' unsubscribe ', 'CANCEL', 'END', 'QUIT', 'REVOKE', 'OPTOUT']) {
  assert.equal(classifySharedMessage(word).kind, 'stop-all');
}
assert.equal(classifySharedMessage('START').kind, 'start-all');
assert.equal(classifySharedMessage('help').kind, 'help');

const message = { messageSid: `SM${'a'.repeat(32)}`, from: 'whatsapp:+12125550100', body: 'SCHOOL hello' };
const calls: string[] = [];
const handlers: SharedSenderHandlers = {
  running: async event => { calls.push(`running:${event.body}`); },
  school: async event => { calls.push(`school:${event.body}`); },
  stopRunning: async () => { calls.push('stop-running'); },
  stopSchool: async () => { calls.push('stop-school'); },
};
await dispatchVerifiedSharedMessage(message, handlers);
assert.deepEqual(calls.splice(0), ['school:hello']);
assert.equal(message.body, 'SCHOOL hello', 'Original signed message remains unchanged');
await dispatchVerifiedSharedMessage({ ...message, body: 'run tomorrow' }, handlers);
assert.deepEqual(calls.splice(0), ['running:run tomorrow']);
await dispatchVerifiedSharedMessage({ ...message, body: 'STOP' }, handlers);
assert.deepEqual(calls.splice(0).sort(), ['stop-running', 'stop-school']);
await assert.rejects(() => dispatchVerifiedSharedMessage({ ...message, body: 'STOP' }, {
  ...handlers, stopRunning: async () => { throw new Error('Offline'); },
}), /opt-out persistence incomplete/);
assert.deepEqual(calls.splice(0), ['stop-school'], 'Other service still receives STOP when running is unavailable');
for (const body of ['START', 'HELP']) {
  await dispatchVerifiedSharedMessage({ ...message, body }, handlers);
  assert.deepEqual(calls, [], 'No silent subscription, consent or AI calls on START/HELP');
}
await assert.rejects(() => dispatchVerifiedSharedMessage({ ...message, messageSid: 'forged' }, handlers));
assert.deepEqual(calls, []);
console.log('Shared sender routing passed: isolation, legacy links, opt-out precedence/fan-out, partial failure and no automatic re-enrollment. No live traffic sent.');
