import assert from 'node:assert/strict';
import {createWorkersAI} from 'workers-ai-provider';
import {parentModelSettings} from '../../server/parent/model-settings';

assert.deepEqual(parentModelSettings({ENVIRONMENT:'production'},'private-affinity'),{sessionAffinity:'private-affinity'},'No production behavior change without explicit rollout');
assert.deepEqual(parentModelSettings({PARENT_AGENT_FAST_RESPONSES_ENABLED:'false'},'key'),{sessionAffinity:'key'});
const settings=parentModelSettings({PARENT_AGENT_FAST_RESPONSES_ENABLED:'true'},'key');
assert.deepEqual(settings.chat_template_kwargs,{enable_thinking:false,clear_thinking:true});
const calls:Array<{inputs:Record<string,unknown>;options:Record<string,unknown>}>=[];
const binding={run:async(_model:unknown,inputs:Record<string,unknown>,options:Record<string,unknown>)=>{
 calls.push({inputs,options});
 if(inputs.stream){return new ReadableStream({start(controller){
  const encode=new TextEncoder();
  controller.enqueue(encode.encode('data: '+JSON.stringify({choices:[{delta:{content:'Hello'},finish_reason:null}]})+'\n\n'));
  controller.enqueue(encode.encode('data: '+JSON.stringify({choices:[{delta:{},finish_reason:'stop'}],usage:{prompt_tokens:10,completion_tokens:2,total_tokens:12}})+'\n\n'));
  controller.enqueue(encode.encode('data: [DONE]\n\n'));controller.close();
 }});}
 return {choices:[{message:{role:'assistant',content:'Hello'},finish_reason:'stop'}],usage:{prompt_tokens:10,completion_tokens:2,total_tokens:12}};
}};
const provider=createWorkersAI({binding:binding as unknown as Ai});
const model=provider('@cf/zai-org/glm-4.7-flash',settings);
const prompt=[{role:'user' as const,content:[{type:'text' as const,text:'Hi'}]}];
const generated=await model.doGenerate({prompt,maxOutputTokens:900});assert.ok(generated.content.some(p=>p.type==='text'&&p.text==='Hello'));
const streamed=await model.doStream({prompt,maxOutputTokens:900});let output='';for await(const chunk of streamed.stream){if(chunk.type==='text-delta')output+=chunk.delta;}assert.equal(output,'Hello');
assert.equal(calls.length,2);
for(const call of calls){
 assert.deepEqual(call.inputs.chat_template_kwargs,{enable_thinking:false,clear_thinking:true},'Actual installed provider forwards thinking controls on model inputs');
 assert.equal(call.options.chat_template_kwargs,undefined,'Controls cannot be silently placed in third-argument options');
 assert.equal(call.inputs.max_tokens,900,'Preserve answer budget');
}
console.log('Parent model passed: opt-in rollout, actual provider generation/streaming passthrough, affinity and answer budget preserved. No provider calls.');
