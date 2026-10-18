// Unsaved work stays in this tab's memory, separate from server drafts and applied campaigns.
export function createEditorDrafts(){
 const baselines=new Map(),unsaved=new Map();
 return {
  open(id,saved){if(unsaved.has(id))return structuredClone(unsaved.get(id));baselines.set(id,JSON.stringify(saved));return structuredClone(saved)},
  update(id,draft){if(JSON.stringify(draft)===baselines.get(id))unsaved.delete(id);else unsaved.set(id,structuredClone(draft))},
  saved(id){unsaved.delete(id);baselines.delete(id)},
  isUnsaved(id){return unsaved.has(id)},
  hasUnsaved(){return unsaved.size>0}
 };
}
