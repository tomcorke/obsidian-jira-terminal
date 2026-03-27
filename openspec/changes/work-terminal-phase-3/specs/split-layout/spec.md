## ADDED Requirements

### Requirement: Three-column resizable layout
MainView SHALL render a 3-column layout: item list (left), detail panel (centre), terminal panel (right). Two draggable dividers SHALL separate the columns.

#### Scenario: Initial layout rendering
- **WHEN** the work-terminal view opens
- **THEN** three panels are visible with draggable dividers between them

#### Scenario: Minimum width constraints
- **WHEN** user drags a divider to shrink a panel
- **THEN** no panel shrinks below its minimum width (200px list, 300px detail, 300px terminal)

### Requirement: Divider drag resizes panels
Dragging a divider SHALL resize adjacent panels by adjusting their `flexBasis`. The terminal panel SHALL refit its xterm instances after resize.

#### Scenario: Drag divider resizes panels
- **WHEN** user drags the left divider rightward
- **THEN** the list panel grows and the detail panel shrinks, with terminal panels refitting

### Requirement: Detail panel adapter slot
If the adapter provides `createDetailView()`, MainView SHALL call it with the centre panel container. If not provided, MainView SHALL render a 2-column layout (list + terminals) instead of 3 columns.

#### Scenario: Adapter provides detail view
- **WHEN** the adapter bundle includes a createDetailView method
- **THEN** the centre panel renders the adapter's detail view

#### Scenario: Adapter omits detail view
- **WHEN** the adapter bundle does not include createDetailView
- **THEN** the layout collapses to 2 columns (list + terminals)

### Requirement: ResizeObserver refits terminals on view switch
MainView SHALL observe its container and trigger terminal refit when the view becomes visible (e.g., switching back from another tab).

#### Scenario: Terminal refit on view switch
- **WHEN** user switches away from and back to the work-terminal tab
- **THEN** terminal dimensions are recalculated to fit the current container size
