import React,{useEffect,useRef} from 'react';
import {statusLabels} from '../server/order-update-email.mjs';
export default function StageFeedback({state,mover}){
 const feedback=useRef(null);
 useEffect(()=>{if(state&&state.state!=='saving')feedback.current?.focus()},[state]);
 if(!state)return null;
 const failed=['error','conflict'].includes(state.state);
 return <div ref={feedback} tabIndex={-1} className={'cv-stage-feedback '+(failed?'cv-error':state.state==='saving'?'cv-note':'cv-success')} role={failed?'alert':'status'}>
  {state.state==='saving'?`Saving stage${state.target?' to '+statusLabels[state.target]:''}…`:state.state==='saved'?`Stage saved: ${statusLabels[state.target]}. No email was sent.`:state.state==='reloaded'?'Latest stage and history loaded. Review them before making another change.':<><strong>{state.state==='conflict'?'This request changed elsewhere.':'Stage could not be confirmed.'}</strong><p>{state.message} The card stays in its last confirmed stage until checked.</p><div className="cv-recovery-actions">{state.state!=='conflict'&&<button className="cv-btn secondary" type="button" onClick={()=>mover.retry()}>Check and retry</button>}<button className="cv-btn secondary" type="button" onClick={()=>mover.reload()}>Reload latest stage</button></div></>}
 </div>;
}
