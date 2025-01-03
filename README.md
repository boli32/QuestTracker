# Quest Tracker

Quest Tracker is a comprehensive tool for managing quests, rumors, and events in a tabletop RPG setting. It integrates seamlessly with Roll20 to provide detailed tracking and visualization of game elements, making it ideal for GMs and players who want to streamline their campaigns.


## Features

- **Quest Management:**
  - Create, edit, and remove quests.
  - Track quest statuses (e.g., "Started", "Completed", "Failed").
  - Group quests into logical categories.

- **Rumor Handling:**
  - Add and manage rumors by location or quest.
  - Generate rumors dynamically.
  - Associate rumors with quest progression.

- **Event Scheduling:**
  - Schedule events with repeatable options.
  - Adjust events based on in-game calendars.

- **Weather and Climate Integration:**
  - Dynamic weather generation based on in-game conditions.
  - Detailed descriptions of current weather conditions.

- **Visual Quest Tree:**
  - Display quests and relationships as a tree diagram.
  - Automatically handle mutually exclusive relationships.

## Getting Started

1. **Installation:**
   Download and add `QuestTracker.js` to your Roll20 game.

2. **Setup:**
   - Initialize the Quest Tracker to get started.
   - Import quests, rumors, and events using handouts or create them manually.

3. **Usage:**
   - Access all features through an intuitive graphical user interface.
   - Navigate through menus to manage quests, rumors, and events seamlessly.

## Rumours Module

The rumours module provides a flexible framework for dynamically integrating narrative elements into your campaign. It connects directly to quests, locations, and events, allowing for automated storytelling and background interactions.

### Module Architecture

#### Data Structures

Rumours are structured hierarchically by quest, status, and location. Example structure:
```
{
  "quest_1": {
    "unknown": {},
    "discovered": {
      "everywhere": {
        "rumour_1": "This is a rumour text"
      },
      "general_store": {
        "rumour_2": "Wonderings of goings on",
        "rumour_4": "Gossip"
      }
    }
  },
  "quest_2": {
    "unknown": {
      "the_boathouse": {
        "rumour_3": "Dave is skimming from the books"
      }
    }
  }
}
```
#### Hierarchy:

* quest: The ID of the associated quest.
* status: The state of the rumour (e.g., unknown, discovered).
* location: The in-game location where the rumour is tied.
* rumour_id: Unique identifier for the specific rumour.
* description: The text of the rumour.

#### Storage:

Rumours are stored in handout files within Roll20.

These files can be imported using Configuration > Refresh/Import JSON data from the module's graphical interface.

The JSON data structure must follow the hierarchical format described above.

#### Locations:

Rumours tied to specific locations are triggered when players interact with those areas.

### Core Functionalities

**Adding and Editing Rumours**

Rumours are managed directly through the graphical interface, providing an intuitive way to organize and modify them:

**Show All Rumours:**

Navigate to the "Show All Rumours" panel to view rumours linked to a specific quest.

Select the relevant quest and choose the status (unknown, discovered, etc.) to which you want to add or edit rumours.

**Location-Specific Actions:**

Under each location, buttons allow for streamlined rumour management:

* "+" Add a Rumour: Add a new rumour to the specified location and status.
* "c" Change: Edit the existing rumour text.
* "-" Remove: Delete the rumour from the selected location.

**Viewing Full Rumour Text:**
* Hover over the magnifying glass icon to see the full rumour text. The displayed text will truncate if it exceeds the visible area.

**Formatting Tips:**
* Use %NEWLINE% to insert line breaks within rumour text.
* Use &quot; to include quotation marks in rumour descriptions.

### Rumour Locations Management

Navigate to "All Rumours > Rumour Locations" to manage locations associated with rumours.

![Rumour Management Screen](https://raw.githubusercontent.com/boli32/QuestTracker/refs/heads/main/img/rumourManagement.png)

Buttons provide streamlined location management:

* "+" Add a Location: Create a new location to associate with rumours.
* "c" Change: Edit the name or properties of an existing location.
* "-" Remove: Delete a location, with a confirmation prompt to ensure that all rumours under the location are not removed unintentionally.

**Automated Updates**

Rumours dynamically adapt to quest progression:

**Quest Status Changes:**

Different quest statuses trigger distinct sets of rumours.

*Example: A quest in the discovered status may have rumours tied to general_store, while the same quest in the completed status has no active rumours.*

**Location-Based Differentiation:**

The same quest and status can yield different rumours depending on the location.

*Example: In everywhere, a rumour might say "A strange light in the forest," while in general_store, it could suggest "A missing person was last seen here."*

Updates are handled programmatically via the updateRumorState method, ensuring seamless transitions and consistency.

## Developer Considerations

### Error Handling:

Ensure rumour_id fields are unique to prevent overwrites.
Validate linked quest and location IDs to maintain data integrity.

### Extensibility:

Add new statuses or integration points as needed. Update corresponding logic in updateRumorState and UI components.






## FAQ

### How do I access the quest tracker interface?
Use the in-game interface provided by the tool. Simply open the menu to begin navigating quests, rumors, and events.

### Can I customize the weather settings?
Yes, the graphical interface allows you to adjust weather trends, add forced conditions, and view detailed weather summaries.

### How are mutually exclusive quests displayed?
Mutually exclusive quests are visually highlighted and organized in the quest tree to prevent conflicts.

---

## Contributing

Contributions are welcome! Please submit pull requests or report issues on the GitHub repository:

[GitHub Repository](https://github.com/boli32/QuestTracker)

---

## Credits

- **Author:** Steven Wrighton (Boli)
- **Contact:** [Roll20 Profile](https://app.roll20.net/users/3714078/boli)
- **License:** MIT

---

Thank you for using Quest Tracker. Happy gaming!

