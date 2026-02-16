---
'@kissmiklosjr/plugin-scaffolder-studio-backend': patch
'@kissmiklosjr/plugin-scaffolder-studio-common': patch
'@kissmiklosjr/plugin-scaffolder-studio': patch
---

- Let’s figure out a better way for the last modified filtering because templates are jumping around because every time we open we basically update the last modified and not only when we actually changed node data. IT’s because a node select/moving the zoom the viewport or the nodes itselfs are triggering a save and when we sync to the db it updates it.
- Let’s add a grouping section to the prefab’s so they are grouped by the published and not published prefabs. Add it into the prefab library view and side content too. Cover it with e2e tests.
- Let’s add option to use your own, not published prefabs in the template editor
- Add an information banner if the synced version is not published. Right now it is really hard to understand if my current prefab that I’m editing is published already or not
- Implement/use the same sync behavior for the prefab editor as we use in the node editor.
- Make alerts transient
- Add a list view toggle next to the search so people can toggle between card and list view in the templteview and prefab view page and trash view. Persist the selected state into local storage. 
- The project name is not updating when I update a template’s name
- Can’t connect prefab to other nodes. Doesn’t get serialized properly when I drop a property into a params node
- Dropping a  prefab into an existing parameters node, it jumps to a weird coordinate and acts like it is inside a bounding box not related to the parameters node. Something is off with the coordinate systems. Ok The order matters. This bug appears when you create prefab first, then create a parameters block and want to drag it into that one. It works if the parameters block exists first.
- Prefab step rjsf is editable in template view, it should be disabled.
- Opening an existing prefab template output node in the prefab editor resets its rsjf data and renders it empty. A published prefab works in editor
- Hm, looks like all of. My published prefabs just disappeared all of a sudden… after a hard refresh they are back. 
- Editing prefab step doesn’t persist the rjsf schema it is empty after editing one field. 

