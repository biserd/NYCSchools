import {answerParent as answerParentLegacy} from './assistant';
import type {AssistantEnvironment} from './service';

type AgentGatewayEnvironment=AssistantEnvironment&{
  PARENT_AGENT_SDK_ENABLED?:string;
  PARENT_ASSISTANT_AGENT?:DurableObjectNamespace<any>;
};

export async function answerParent(userId:string,env:AgentGatewayEnvironment,input:unknown) {
  if(env.PARENT_AGENT_SDK_ENABLED==='true'&&env.PARENT_ASSISTANT_AGENT){
    const {answerParentAgent}=await import('./agent-sdk');
    return answerParentAgent(userId,env,input);
  }
  return answerParentLegacy(userId,env,input);
}

export async function clearParentConversation(userId:string,env:AgentGatewayEnvironment) {
  if(env.PARENT_AGENT_SDK_ENABLED==='true'&&env.PARENT_ASSISTANT_AGENT){
    const {clearParentAgentConversation}=await import('./agent-sdk');
    await clearParentAgentConversation(userId,env);
  }
}
