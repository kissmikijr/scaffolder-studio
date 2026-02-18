# @kissmiklosjr/plugin-scaffolder-studio

## 0.1.18

### Patch Changes

- 03dea37: Align newly created nodes horizonatlly
  Add auto align option vertically and horizontally with shift
  Change default alignemnt on toolbar node creations
  Fix thumbnail creation with new save logic
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
- Updated dependencies [154d893]
- Updated dependencies [387f591]
  - @kissmiklosjr/plugin-scaffolder-studio-common@0.0.16

## 0.1.17

### Patch Changes

- da125d9: Fix annotations and dont override the rjsf editor with stale data
  Removes the redundand execution steps from the dryrunview page
- f6a7f7a: Rework the handles, hadnle creation and connection. Support all handles for all
  Fixes edge type jittering. Use smoothstep all the way
- Updated dependencies [da125d9]
  - @kissmiklosjr/plugin-scaffolder-studio-common@0.0.15

## 0.1.16

### Patch Changes

- b2f34a1: Fix some more stuff
- 23eeace: Add some more e2e tests
- 3884ca5: Add filter for list pages
- 18da56a: Fix a load of stuff...
- f971f66: Cleanup and more tests
- Updated dependencies [d218c3e]
  - @kissmiklosjr/plugin-scaffolder-studio-common@0.0.14

## 0.1.15

### Patch Changes

- 01505f6: Fix SelectWidget and UIFieldConfig dropdown rendering with proper cursor and hover states
- c6f9b75: Make editor side dry
- b8673d1: Fix inputlabel overlaps, Fix the node creation from prefabs, fix prefab editor

## 0.1.14

### Patch Changes

- ef19872: Make token parsing DRY
- 891365c: Fixes the cursor reset issue in the step node
  Adds support for the icon key in the output node
  Fix parsing logic of plain parameters.xxx and steps['xxx'].output['xxx'] expressions
  Consolidate on popper logix and deduplicate composer components
  Add tiny helper text about usage
- e00c6bc: fix import preserve sizes and positions
- Updated dependencies [891365c]
- Updated dependencies [e00c6bc]
  - @kissmiklosjr/plugin-scaffolder-studio-common@0.0.13

## 0.1.13

### Patch Changes

- b882e1c: Add property description support
  Fix schema inputs to not reset cursor mid typing
  Rework the output node side content rendering
- Updated dependencies [b882e1c]
  - @kissmiklosjr/plugin-scaffolder-studio-common@0.0.12

## 0.1.12

### Patch Changes

- 3973d6a: Fix stuff

## 0.1.11

### Patch Changes

- 5365f5d: Make edges snapabble to straight
- 0e4f695: Add snap functionality with "shift" key
- fb81989: Add auto-snap to edges
- Updated dependencies [5365f5d]
- Updated dependencies [fb81989]
  - @kissmiklosjr/plugin-scaffolder-studio-common@0.0.11

## 0.1.10

### Patch Changes

- 7aec7cd: Save dryrun inputs
- 73526cd: Tweak some stuff
- 7ba7c0d: Edge types and SchemaPatcher update
- Updated dependencies [7aec7cd]
  - @kissmiklosjr/plugin-scaffolder-studio-common@0.0.10

## 0.1.9

### Patch Changes

- ae5853a: Parameters as group nodes for property nodes
- 96da80a: Rework presentation node displays
- Updated dependencies [96da80a]
  - @kissmiklosjr/plugin-scaffolder-studio-common@0.0.9

## 0.1.8

### Patch Changes

- 3ccac63: Release
- Updated dependencies [3ccac63]
  - @kissmiklosjr/plugin-scaffolder-studio-common@0.0.8

## 0.1.7

### Patch Changes

- Updated dependencies [3896628]
  - @kissmiklosjr/plugin-scaffolder-studio-common@0.0.7

## 0.1.6

### Patch Changes

- ba8109d: stg

## 0.1.5

### Patch Changes

- 7d86f82: more peer dep

## 0.1.4

### Patch Changes

- 61797ca: pin lezer

## 0.1.3

### Patch Changes

- 84e0a70: lezer

## 0.1.2

### Patch Changes

- 8fe567b: sd
  :wq

## 0.1.1

### Patch Changes

- 8015ee9: Now?

## 0.1.0

### Minor Changes

- af25582: Automated release from commit 2635933
- Automated release from commit af25582

## 0.0.12

### Patch Changes

- 761f668: asd

## 0.0.11

### Patch Changes

- 327cfbf: Migrate to mui v5

## 0.0.10

### Patch Changes

- 3f5d6fc: export the component router

## 0.0.9

### Patch Changes

- Updated dependencies [c890ac3]
  - @kissmiklosjr/plugin-scaffolder-studio-common@0.0.6

## 0.0.8

### Patch Changes

- d5cae31: Luxon in deps

## 0.0.7

### Patch Changes

- e8e440b: test

## 0.0.6

### Patch Changes

- e90265e: add

## 0.0.5

### Patch Changes

- e7c4521: Try with npm token
- Updated dependencies [e7c4521]
  - @kissmiklosjr/plugin-scaffolder-studio-common@0.0.5

## 0.0.4

### Patch Changes

- ef9a473: see
- 7d1a854: Fix publishing by switching to Yarn native publish command to handle workspace protocol resolution.
- Updated dependencies [ef9a473]
  - @kissmiklosjr/plugin-scaffolder-studio-common@0.0.4

## 0.0.3

### Patch Changes

- ef91c91: release
- Updated dependencies [ef91c91]
  - @kissmiklosjr/plugin-scaffolder-studio-common@0.0.3

## 0.0.2

### Patch Changes

- a5dc2d4: LEts see if it can be installed
- Updated dependencies [a5dc2d4]
  - @kissmiklosjr/plugin-scaffolder-studio-common@0.0.2

## 0.2.1

### Patch Changes

- d4246b9: initial release maybe
- Updated dependencies [d4246b9]
  - @kissmiklosjr/plugin-scaffolder-studio-common@0.2.1

## 0.2.0

### Minor Changes

- 833f41e: Initial release of Backstage scaffolder studio plugins with npm publishing configured. All packages are published as private packages with restricted access.

### Patch Changes

- Updated dependencies [833f41e]
  - @kissmiklosjr/plugin-scaffolder-studio-common@0.2.0
