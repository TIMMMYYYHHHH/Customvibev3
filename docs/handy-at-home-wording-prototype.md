# Handy at home details prototype

Owner visual approval, 18 October 2026: “i like it” approves the current local design with handwritten entries, fixed headings/labels and all nine editable templates. This resolves local visual review. Existing-studio, basket, order/admin and print integration remain outstanding; no live deployment or physical print acceptance is implied. Earlier pending visual-review wording below is historical.

## Current expansion: handwritten entries on all nine

18 October 2026: owner approved the fixed-heading approach and asked for less typed-looking entries plus editing on Our week, Pet care and the remaining magnets. All nine now expose their variable entries. Headings, weekday labels, pet routine labels and other fixed artwork stay fixed. The bundled Patrick Hand font is used for customer entries; controls retain the normal UI font.

Four non-destructive image-tool edits remove only baked-in example values: bin collection days, pet times, weekly activities and departure checklist items. Edited assets are sibling `*-editable.png` files; original PNGs are retained. Source mappings and removal prompts are in output/handy-at-home/v2/edit-sources.json. Existing five blank-field templates reuse their original artwork.

Local verification: Our week updates Monday to Tennis; Pet care accepts 08:30 at a fixed template font size; Bin day accepts Wednesday; Before you leave updates its first item to Lunch. Width validation still blocks oversized entries rather than shrinking. Values remain through keep/reopen in the session. Screenshot: output/handy-at-home/v2/handwritten-week.png. Local review only; production integration and physical print acceptance remain open.

## Current owner correction

18 October 2026: the previous interpretation was rejected. Restore the original nine illustrated designs with their existing headings and labels fixed. Only the original blank writing spaces become editable text fields. Do not replace the artwork, rename the original designs, or expose heading/label edits. Current review is still http://127.0.0.1:5194/v2/.

Five originals have blank areas: Emergency contacts (Family, Neighbour, Doctor), Tonight’s dinner (three lines), Shopping list (four items), Plant notes (Plant, Light, Water), and Home helpers (Plumber, Electrician, Handyman). The other four original images remain fixed examples. `fields.json` defines only the permitted blank-area text positions and width limits; original PNGs are unchanged. Blank inputs are allowed and their placeholder hints never print. Suggested action is now “Add your details”.

Verified: emergency details render below their existing labels; plant details fit their original boxes; excessive plant text blocks retaining/download instead of shrinking; JavaScript syntax passes. Screenshot: output/handy-at-home/v2/fixed-headings-editor.png. Local only, no basket or live publication. This supersedes the editable headings, replacement designs and labels described in the historical exploration below.

## Superseded exploration

18 October 2026. Owner accepted replacing cramped handwritten fields with short preprinted personalised wording and requested exploration of editing through the magnet studio. This supersedes the first nine writing-space concepts.

## Local review

Open http://127.0.0.1:5194/v2/. Files and exact generation prompts are in output/handy-at-home/v2/designs.json; source mappings are in sources.json. Nine separate generated backgrounds have no baked-in text. The local canvas combines each background with real text, so changing wording needs no image generation.

Revised designs: emergency contacts, bin day, pet emergency contact, school pickup, pet routine, plant reminder, household reminder, home helpers and before-you-leave reminder. Every face is square for 75 × 75 mm. Details are fictional placeholders. The interface adds preview depth separately from the flat artwork.

Suggested collection label: “Personalise the wording”. Action: “Edit wording”. Choose a finished design, replace its heading and two to four short lines, check the preview, then retain the words. Fixed typography and measured width limits reject excessive text instead of shrinking it. Physical print readability still requires an actual-size test.

Verified locally: all nine canvases render; Bin day changes instantly from Tuesday to Wednesday; retaining and reopening preserves Wednesday in this session; an overly wide value shows a shortening message and blocks retaining/exporting until corrected. JavaScript syntax check passes. Gallery and editor screenshots are saved alongside the prototype. PNG download is present but browser automation timed out waiting for its event, so download completion is not verified.

This is a standalone local trial. It does not add to the live basket, create orders, send emails or persist personal details after reload. The live studio is not yet an editable-wording product.

## Proposed existing-studio integration

Keep the established photo and puzzle flows. Add a template context to the existing studio rather than introducing another separate business brief form. A template stores its ID/version, fixed background/layout and supported editable fields; the customer's words stay separate from the image.

Use the same renderer for preview and flat print output. Preserve template identity and exact words through basket editing, order capture and admin review/download. Validate allowed templates, field lengths and layout limits on the server as well as in the browser. Do not accept an arbitrary client-provided print image as proof of validated wording.

Keep final artwork approval, private downloads, 14-day retention, manual status emails, authentication and disabled payments unchanged. The initial editor should offer wording changes only, without free dragging or font controls. Owner review of the nine designs and local editor precedes implementation and publication. Order/admin integration and physical print acceptance remain separate outstanding work.

Founders Hub integration subtask: Personalise template wording in the existing magnet studio, 91547b74-1102-4990-87c8-0e30c9694964, Website & checkout, Planned. Initial creation had an interrupted response and failed recovery. A fresh board search confirmed absence before retry; the new task and its description then saved. Existing nine-artwork review remains separate and incomplete.

Fresh browser verification confirmed the single integration subtask and full scope persisted, and the revised artwork activity comment persisted on the original artwork subtask. A separate integration activity comment failed to save; its verification details and the Hub interrupted-save bug remain documented here. No duplicate task was created.

Owner correction tracking: the existing Founders Hub integration subtask description now explicitly fixes original headings/labels and limits editing to blank spaces. Persistence verified after reload on 18 October.
