// Execute actual service/context/form functions with controlled Supabase responses.
// No remote requests or accounts are created.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {transformSync} = require('esbuild');
const service = fs.readFileSync('src/services/supabase.ts','utf8');
const context = fs.readFileSync('src/context/CatalogContext.tsx','utf8');
const form = fs.readFileSync('src/components/auth/AuthModal.tsx','utf8');
function compile(source, globals, exported) {
  const module={exports:{}};
  vm.runInNewContext(transformSync(source+'\nmodule.exports='+exported, {loader:'tsx',format:'cjs'}).code,
    {module,exports:module.exports,...globals});
  return module.exports;
}
const signupSource = service.match(/^export async function supabaseSignUp\([\s\S]*?^}/m)[0];
const registerSource = context.match(/^  const registerUser = async \([\s\S]*?^  };/m)[0];
const submitSource = form.match(/^  const handleRegisterSubmit = async \([\s\S]*?^  };/m)[0];
const input={email:'qa@example.test',password:'local-test-only',fullName:'Cliente Teste'};
(async()=>{
  for (const kind of ['confirmation','session','error','missing-user']) {
    const writes=[];
    const user={id:'synthetic-id'};
    const signup=compile(signupSource,{
      getSupabaseClient:()=>({auth:{signUp:async()=>({
        data:{user:kind==='missing-user'?null:user,session:kind==='session'?{user}:null},
        error:kind==='error'?{message:'Signup refused'}:null,
      })}}),
      upsertCustomerProfileToSupabase:async p=>{writes.push(p);return true},
      translateSupabaseAuthError:s=>s,
    },'supabaseSignUp');
    const result=await signup(input.email,input.password,input);
    assert.equal(result.success,kind==='confirmation'||kind==='session');
    assert.equal(writes.length,kind==='session'?1:0);
    if(kind==='confirmation') {
      assert.equal(result.requiresEmailConfirmation,true);
      assert.equal(result.user,undefined,'Pending signups must not expose an authenticated profile');
    }
    if(kind==='session') {
      assert.equal(result.user.id,user.id);
      assert.equal(result.user.role,'customer');
      assert.notEqual(result.requiresEmailConfirmation,true);
    }
  }
  for (const pending of [true,false]) {
    const assignments=[],notices=[];
    const result={success:true,message:'Confirmation guidance',isOwner:false,
      requiresEmailConfirmation:pending,user:pending?undefined:{id:'real-session-user'}};
    const register=compile(registerSource,{
      supabaseSignUp:async()=>result,setIsAuthChecking:()=>{},setAuthErrorMessage:()=>{},
      setCurrentUser:user=>assignments.push(user),
      toast:{info:(...x)=>notices.push(['info',...x]),success:(...x)=>notices.push(['success',...x]),error:()=>assert.fail('Unexpected signup error')},
    },'registerUser');
    const registered=await register(input);
    assert.equal(registered.success,true);
    assert.equal(assignments.length,pending?0:1,'Only real sessions may sign in');
    assert.equal(notices[0][0],pending?'info':'success');
    assert.equal(registered.requiresEmailConfirmation,pending?true:undefined);
    const modes=[],passwords=[],timers=[],messages=[];
    const submit=compile(submitSource,{
      ...input,phoneWhatsapp:'',street:'',cep:'',number:'',bairro:'',complement:'',city:'',state:'',
      registerUser:async()=>registered,setErrorMsg:()=>{},setSuccessMsg:s=>messages.push(s),setIsLoading:()=>{},
      setPassword:p=>passwords.push(p),setMode:m=>modes.push(m),
      setTimeout:fn=>timers.push(fn),closeAuthModal:()=>{},
    },'handleRegisterSubmit');
    await submit({preventDefault(){}});
    assert.equal(passwords[0],'');
    assert.equal(messages.at(-1),registered.message);
    assert.equal(timers.length,pending?0:1,'Confirmation guidance must remain visible');
    assert.equal(modes[0],pending?'login':undefined);
  }
  console.log('PASS: pending signup never creates a local login or writes a profile; authenticated signup, refused signup, context state and persistent confirmation guidance verified. Local mocks only.');
})().catch(error=>{console.error(error);process.exitCode=1});
