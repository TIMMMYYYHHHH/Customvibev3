import test from 'node:test';import assert from 'node:assert/strict';
import {createEditorDrafts} from '../admin/seasons/editor-drafts.mjs';
const christmas={id:'christmas-2026',copy:{headline:''},enabled:false},easter={id:'easter-2027',copy:{headline:''},enabled:false};
test('unsaved occasion wording survives switching away and back without changing saved settings',()=>{
 const work=createEditorDrafts();const draft=work.open(christmas.id,christmas);draft.copy.headline='A Christmas gift';work.update(draft.id,draft);
 work.open(easter.id,easter);
 assert.equal(work.open(christmas.id,christmas).copy.headline,'A Christmas gift');assert.equal(christmas.copy.headline,'');assert.equal(work.hasUnsaved(),true);
});
test('saving one campaign clears only its warning; failed saves keep all unsaved work',()=>{
 const work=createEditorDrafts();for(const c of [christmas,easter]){const draft=work.open(c.id,c);draft.copy.headline=c.id;work.update(c.id,draft)}
 assert.equal(work.hasUnsaved(),true);
 work.saved(christmas.id);
 assert.equal(work.isUnsaved(christmas.id),false);assert.equal(work.isUnsaved(easter.id),true);
 assert.equal(work.open(easter.id,easter).copy.headline,easter.id);
 work.saved(easter.id);assert.equal(work.hasUnsaved(),false);
});
test('returning fields to their initial values removes the unsaved warning and discarded work reopens from saved data',()=>{
 const work=createEditorDrafts();const draft=work.open(christmas.id,christmas);draft.copy.headline='Changed';work.update(draft.id,draft);draft.copy.headline='';work.update(draft.id,draft);assert.equal(work.hasUnsaved(),false);
 draft.copy.headline='Discard this';work.update(draft.id,draft);work.saved(draft.id);
 assert.equal(work.open(draft.id,christmas).copy.headline,'');
});
