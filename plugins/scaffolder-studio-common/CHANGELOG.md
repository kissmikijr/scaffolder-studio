# @kissmiklosjr/plugin-scaffolder-studio-common

## 0.0.16

### Patch Changes

- 154d893: Add e2e tests for list views
- 387f591: - Let’s figure out a better way for the last modified filtering because templates are jumping around because every time we open we basically update the last modified and not only when we actually changed node data. IT’s because a node select/moving the zoom the viewport or the nodes itselfs are triggering a save and when we sync to the db it updates it.
  - Let’s add a grouping section to the prefab’s so they are grouped by the published and not published prefabs. Add it into the prefab library view and side content too. Cover it with e2e tests.
  - Let’s add option to use your own, not published prefabs in the template editor
  - Add an information banner if the synced version is not published. Right now it is really hard to understand if my current prefab that I’m editing is published already or not
  - Implement/use the same sync behavior for the prefab editor as we use in the node editor.
  - Make alerts transient
  - Add a list view toggle next to the search so people can toggle between card and list view in the templteview and prefab view page and trash view. Persist the selected state into local storage.
  - The project name is not updating when I update a template’s name
  - Can’t connect prefab to other nodes. Doesn’t get serialized properly when I drop a property into a params node
  - Dropping a prefab into an existing parameters node, it jumps to a weird coordinate and acts like it is inside a bounding box not related to the parameters node. Something is off with the coordinate systems. Ok The order matters. This bug appears when you create prefab first, then create a parameters block and want to drag it into that one. It works if the parameters block exists first.
  - Prefab step rjsf is editable in template view, it should be disabled.
  - Opening an existing prefab template output node in the prefab editor resets its rsjf data and renders it empty. A published prefab works in editor
  - Hm, looks like all of. My published prefabs just disappeared all of a sudden… after a hard refresh they are back.
  - Editing prefab step doesn’t persist the rjsf schema it is empty after editing one field.

## 0.0.15

### Patch Changes

- da125d9: Fix annotations and dont override the rjsf editor with stale data
  Removes the redundand execution steps from the dryrunview page

## 0.0.14

### Patch Changes

- d218c3e: Split create and update logic for clean template creations

## 0.0.13

### Patch Changes

- 891365c: Fixes the cursor reset issue in the step node
  Adds support for the icon key in the output node
  Fix parsing logic of plain parameters.xxx and steps['xxx'].output['xxx'] expressions
  Consolidate on popper logix and deduplicate composer components
  Add tiny helper text about usage
- e00c6bc: fix import preserve sizes and positions

## 0.0.12

### Patch Changes

- b882e1c: Add property description support
  Fix schema inputs to not reset cursor mid typing
  Rework the output node side content rendering

## 0.0.11

### Patch Changes

- 5365f5d: Make edges snapabble to straight
- fb81989: Add auto-snap to edges

## 0.0.10

### Patch Changes

- 7aec7cd: Save dryrun inputs

## 0.0.9

### Patch Changes

- 96da80a: Rework presentation node displays

## 0.0.8

### Patch Changes

- 3ccac63: Release

## 0.0.7

### Patch Changes

- 3896628: point to compiled

## 0.0.6

### Patch Changes

- c890ac3: add deps

## 0.0.5

### Patch Changes

- e7c4521: Try with npm token

## 0.0.4

### Patch Changes

- ef9a473: see

## 0.0.3

### Patch Changes

- ef91c91: release

## 0.0.2

### Patch Changes

- a5dc2d4: LEts see if it can be installed

## 0.2.1

### Patch Changes

- d4246b9: initial release maybe

## 0.2.0

### Minor Changes

- 833f41e: Initial release of Backstage scaffolder studio plugins with npm publishing configured. All packages are published as private packages with restricted access.
