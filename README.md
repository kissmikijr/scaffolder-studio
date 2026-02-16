# Features

## Projects

A project equals to one yaml file. It can contain multiple backstage templates. 
Projects can be created, trashed. 
A trashed project can be permanently deleted.
You can import existing backstage templates in yaml or json format.


## Editor

There is an add template button. This starts the editing flow by adding the initial parent template node to the project.
In the right side menu you can give a name to the project. By default it will be called untitled.
Under the title field there is a search bar. One can search for node name/titles, query is submitted on enter and the view should jump to that.

The right side menu contains the form editor for the different nodes. The content depends on the selected node. It does not need to be submitted it auto updates.

You can create backstage template yaml files in a node graph representation. There are 5 different node types.

- template
- step
- parameter
- property
- output

### Template

A node that corresponds to the general envelope properties of a backstage template yaml file.
It has 3 connection points. One which can be used to make steps. One to make parameters and one for the output.

A template node can have only 1 direct connection to a step, parameter or output node.

### Step

This contains the `spec.step`. You can select an action. The actions are fetched from your instance's scaffolder API. 
The form is rendered via the rjsf input schema. If the selected action has output schema the available outputs will be rendered into a popper. It can be toggled via the `>`. 

A step can be connected to another step node. To make a new step node drag from the right side handle. The new node will be created where you drop.

In the form when you select an input field a popper will be rendered under/over the inputfield. This popper contains the available parameters or other step outputs for this particular node. If a parameter or step output is not avaialbe it means this step does not have access to it. On selecting a field the correct template string will be inserted into the inputfield.

### Parameter

This node is a filler node which only acts as a group for the children property nodes. It controlls the title of the parameters block. To create a property node drag the right side handle of the node on drop it will create the property node.

### Property
Property nodes are the parameter properties. These are available in the step nodes. You can configure the name, type and required field on the property.


### Output

Output section of the backstage yaml file with link or free text block

---

## Alpha Frontend (New Frontend System)

This project includes a frontend using the [new Backstage frontend system](https://backstage.io/docs/frontend-system/). The alpha frontend is available on a separate entry point.

### Running the Alpha Frontend

```bash
yarn start:alpha
```

### What's Different

The alpha frontend is **fully migrated** to the new frontend system:
- All plugins imported from `/alpha` subpaths (catalog, scaffolder, techdocs, etc.)
- APIs as `ApiBlueprint` extensions
- Sign-in page as `SignInPageBlueprint`
- Custom sidebar as `NavContentBlueprint`  
- Visual Editor as `PageBlueprint`
- Feature discovery enabled

No compatibility helpers (`convertLegacyAppOptions`, `convertLegacyAppRoot`) are used.

See the [Backstage migration guide](https://backstage.io/docs/frontend-system/building-apps/migrating/) for more details.
