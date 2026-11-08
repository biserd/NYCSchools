// A deploy-time switch, never a user-supplied query parameter. Keep the original
// production behavior until the fast profile passes staging review.
export function parentModelSettings(env:{ENVIRONMENT?:string;PARENT_AGENT_FAST_RESPONSES_ENABLED?:string},sessionAffinity:string) {
  return {
    sessionAffinity,
    ...(env.PARENT_AGENT_FAST_RESPONSES_ENABLED==='true'?{
      // GLM's documented switch is enable_thinking, not reasoning_effort:none.
      // Retain conversation text/tool evidence, but don't replay hidden reasoning.
      chat_template_kwargs:{enable_thinking:false,clear_thinking:true},
    }:{}),
  };
}
