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

![Rumour Screen](https://raw.githubusercontent.com/boli32/QuestTracker/refs/heads/main/img/rumours.png)

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

**How to Show?**

This is stright-forward; simply choose the location the players are in, and select how many (random) rumours will be shown in chat. 'Eeverywhere' is a global location and rumours will be chosen from either the selected location OR everywhere.

![Show Button](https://raw.githubusercontent.com/boli32/QuestTracker/refs/heads/main/img/show_rumours.png)

![Rumour Display](https://raw.githubusercontent.com/boli32/QuestTracker/refs/heads/main/img/rumour_display.png)

## Developer Considerations

### Error Handling:

Ensure rumour_id fields are unique to prevent overwrites.
Validate linked quest and location IDs to maintain data integrity.


# QUEST Module

The QUEST Module is a core component of the Quest Tracker system for Roll20. It provides robust quest management features, allowing game masters to dynamically control quest progression, relationships, and status changes, all integrated seamlessly into sandbox-style RPG campaigns.

---

## Features

### Quest Management
- Create, update, and delete quests using an intuitive graphical interface.
- Track quest statuses:
  - **Unknown:** The Quest is unknown at this point. it is worth noting rumours can exists for quests within this state.
  - **Discovered:** The quest has been discovered but not necessarily active or accepted.
  - **Started:** The quest is currently in progress, and has been accepted
  - **Ongoing:** The quest is currently ongoing.
  - **Completed:** The quest has been completed.
  - **Completed by Someone Else:** Another band of adventurers perhaps?
  - **Failed:** The quest was not completed as intended.
  - **Time ran out:** The arbitary time has run out on the quest
  - **Ignored:** The clues have not been followed or the PCs have clearly ignored this quest

As you can see whilst these statuses are at this time hard coded ine, there is a lot of room to wiggle in how you define a quest's status.
Depending on feedback I may allow these statuses to be user specific, although it is a fair amount of work.

### Prerequisites and Dependencies
- Define quest prerequisites to unlock quests based on player actions or story progression.
- Establish mutually exclusive relationships between quests to enforce narrative constraints.
- Auto-advance quests based on time-sensitive conditions.

None of these quest relasionships rules are rigidly enforced within the code; but will allow you as the DM to follow a basic story logic, as well as offer a more visual way for the players to understand what is happening if they try to support one faction over another.

---

## Data Structure

Quests are stored in a hierarchical JSON format, supporting complex relationships. Example:

```json
"quest_1": {
    "name": "Primary Quest",
    "description": "This is a Primary Quest",
    "relationships": {
      "logic": "AND",
      "conditions": [
        "quest_4",
        {
          "logic": "OR",
          "conditions": [
            "quest_2",
            "quest_3"
          ]
        },
        {
          "logic": "OR",
          "conditions": [
            "quest_7",
            "quest_9"
          ]
        }
      ],
      "mutually_exclusive": []
    },
    "hidden": false,
    "autoadvance": {
      "unknown": "1970-01-01"
    },
    "group": "6",
    "level": 3
  },
  "quest_8": {
    "name": "Secondary Quest",
    "description": "There are more quests here?",
    "relationships": {
      "logic": "AND",
      "conditions": [
        "quest_12"
      ]
    },
    "hidden": false,
    "autoadvance": {},
    "level": 1,
    "group": "6"
  },
  "quest_11": {
    "name": "Another Quest?",
    "description": "Clearly this game has a lot of quests.",
    "relationships": {
      "logic": "AND",
      "conditions": [
        "quest_4"
      ],
      "mutually_exclusive": [
        "quest_12"
      ]
    },
    "hidden": false,
    "autoadvance": {},
    "group": "6",
    "level": 2
  }
```

### Quest Features

* **Name:** The name of the quest, defaults to 'New Quest' and it is does not need to be unique.
* **Description:** A short description of the quest; it will be the tooltip on the Quest Tree page.
* **Status:** The status of the quest, this is stored in a rollable table as a 'weight'.
* **Hidden:** This quest is completely hidden from the Players when displayed on the page, the relasionships of this quest are also hidden. If you do not use the Quest Tree page there no difference betwene a hidden quest or a visible one (e.g. rumours from hidden quests are still shown), by default quests start out as hidden.
* **Quest Group:** This is to help you organise your quests better, relasionships can only be formed by quests within their own quest group.
* **AutoAdvance:** Simply add a Date (YYYY-MM-DD) into one of the status fields and when that date occurs the quest will autoadvance to that specific status; it will then clear this field. There are no checks to make sure things go in the correct order it is up to you to maintain your own quests.
* **Icon:** (potentially a future UI implimentation) This is actually a hidden field as I have currently not built a UI for it, but on the rollable table you can upload an icon for the quest which will appear as a token on the Quest Tree Page. This is important as it will allow you to use tokenmod commands to trigger a quest change in state using the questID in the GM Notes field of said token.

### Navigating the UI

![A standard quest page](https://raw.githubusercontent.com/boli32/QuestTracker/refs/heads/main/img/quest_page.png) ![An Extensive Quest](https://raw.githubusercontent.com/boli32/QuestTracker/refs/heads/main/img/extensive_quest.png)

* If the + buttons are shaded grey and cannot be selected it means there are no valid quests to add, quests need to be in the same quest group and not already be selected in a relasionship
* Quest Relationships work on a AND and OR functionality and you can put them within relasionship groups in order to visualise the prerequisities; as you can see in the more complex quest tree; five quests are its prerequisites (under AND) but 4 of them are separated into two groups of OR functionality, the grouped quests are also mutually exclusive with each other (note the red line).
* The Quest diagram is generated automatically and only works on a quest by quest basis (so no futher back); if you come across any failures within rendering please make sure you raise this as an issue. note: before you do this drag the chat window wider, as most issues are resolved with this.





## Weather Module

### Overview

The Weather Module is designed to simulate dynamic weather conditions, taking into account environmental trends, forced modifiers, and randomness. This module supports graphical visualizations for key weather parameters and provides an intuitive interface for adjusting and interpreting weather trends.

### Key Weather Parameters

Weather is determined by six key values; each value is rated on a scale of 0 to 100, with 50 representing the average condition. A random number is generated daily to define the weather, following a restricted bell curve distribution centered at 50 (see Bell Curve Graph).

#### Temperature Distribution

![Temperature Graph](https://raw.githubusercontent.com/boli32/QuestTracker/refs/heads/main/img/temp.png)

#### Precipitation Distribution

![Precipitation Graph](https://raw.githubusercontent.com/boli32/QuestTracker/refs/heads/main/img/rain.png)

#### Wind Speed Distribution

![Wind Speed Graph](https://raw.githubusercontent.com/boli32/QuestTracker/refs/heads/main/img/wind.png) 

#### Humidity Distribution

![Humidity Graph](https://raw.githubusercontent.com/boli32/QuestTracker/refs/heads/main/img/humid.png)

#### Cloud Cover Distribution

![Cloud Cover Graph ](https://raw.githubusercontent.com/boli32/QuestTracker/refs/heads/main/img/cloud.png)
 
#### Visibility Distribution

![Visibility Graph](https://raw.githubusercontent.com/boli32/QuestTracker/refs/heads/main/img/visibility.png)

#### Bell Curve Graph

![Bellcurve Graph](https://raw.githubusercontent.com/boli32/QuestTracker/refs/heads/main/img/bellcurve.png)


### Climate Configuration

Users can select a specific climate configuration, which adjusts weather values based on predefined modifiers. These modifiers vary between -20 to +20 and are season-dependent, linked to the Calendar Module. For instance:

*Icewind Dale (Forgotten Realms): During the "Long Winter" season, the temperature adjustment is -20, the maximum possible adjustment.*

### Daily Adjustments

Weather values change by a maximum of +/- 5 points per day. Near seasonal boundaries (e.g., winter transitioning to spring), this limit increases to +/- 10 points. There is a small chance, especially near seasonal boundaries, that these adjustments can double to +/- 10 or +/- 20 points, resulting in massive weather shifts.

### Forced Trends

A Forced Trend feature can be toggled on or off. When activated, this applies a fixed +/- 20-point difference to simulate significant weather deviations, overriding standard adjustments, this option can be can be found underneath configutation

### How to Use the Module

![Weather GUI](https://raw.githubusercontent.com/boli32/QuestTracker/refs/heads/main/img/weather.png)

#### Initialize the Weather System:

The weather system can be enabled or disabled in the configuration menu. It is enabled by default.

#### Select a Climate Zone:
In the configuration menu, choose the climate zone your players are in (e.g., Northern Temperate or Equatorial). Climate zones are specific to the selected calendar. For instance, the Harptos climates are based on common adventure areas rather than a general climate type like temperate.

#### Change Player Location:
You can change the location the players are in under the 'Adjust Date' menu. Examples include selecting Plains, Swamp, or other terrain types.

### Weather Descriptions

The module provides detailed descriptions of weather conditions based on the player's location and daily weather parameters. When weather is enabled, the description is shown to players as a /desc message whenever the day advances.

![Weather Description](https://raw.githubusercontent.com/boli32/QuestTracker/refs/heads/main/img/weatherdescription.png)

#### Weather Condition Matching

Each day, weather conditions are matched to predefined scenarios. For example:

```"Persistent Downpour": {
    "conditions": {
        "temperature": { "gte": 50, "lte": 70 },
        "precipitation": { "gte": 60 },
        "wind": { "lte": 50 },
        "humidity": { "gte": 60 },
        "cloudCover": { "gte": 60 },
        "visibility": { "lte": 50 }
    }
}```

Each scenario is linked to over **11,000 unique descriptions** for potential player locations, such as plains, farms, or forests. These descriptions create immersive and varied environmental narratives.

## FAQ

### How do I access the quest tracker interface?
Use the in-game interface provided by the tool. Simply open the menu to begin navigating quests, rumors, and events by typing !qt into chat

### Can I customize the weather settings?
Yes, the graphical interface allows you to adjust weather trends, add forced conditions.

### How are mutually exclusive quests displayed?
Mutually exclusive quests are visually highlighted and organized in the quest tree to prevent conflicts.

### Can I adjust weather effects manually
Technically, yes you can, by editing the JSON files direct and setting the date to before these changes took place. It is advisable to use the inbuilt tools and make sure the weather runs for a couple of months bfore you start the campaign to even out any extreme fluctuations. Look to forcing weather trends if you wanted to have a drought or cold snap effect the world outside of the seasonal changes.


---

## Updates

#### 2025-01-06
* **v0.9.1.3** Fixed Climate modifiers and adjusted bellcurve
#### 2025-01-03
* **v0.9.1.2** Disabled Quest Relationship buttons when no quests available.
* **v0.9.1.1** Fixed Quest Group Dropdown Menu
* **v0.9.1** Adjusted climate values and streamlined climate values
#### 2025-01-02
* **v0.9.0.1** Fixed rumour filtering issue
#### 2024-12-19
* **v0.9** Initial Upload


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

